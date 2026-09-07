# DevOps-Suite CI/CD Pipeline --- Problems Faced and How We Resolved Them

## 1. Overview

While building the GitHub Actions CI/CD pipeline for **DevOps-Suite**,
the main goals were:

-   Build and test the backend and frontend.
-   Publish Docker images to GitHub Container Registry (GHCR).
-   Keep only the **3 most recent successful releases**.
-   Avoid counting failed publishes as releases.
-   Handle GHCR's additional untagged artifacts, including
    provenance/attestation artifacts.
-   Prevent the frontend and backend from becoming inconsistent when one
    image publishes successfully and the other fails.
-   Make the release process safer by separating image publication from
    release promotion.

The final design uses separate build jobs, separate image-publishing
jobs, and a release-promotion stage.

------------------------------------------------------------------------

# 2. Problem: Understanding When Images Should Be Published

### Initial situation

The workflow had separate backend and frontend build/test jobs and
separate publishing jobs.

We wanted Docker images to be published only after the application had
passed validation.

### Solution

The publishing jobs depend on **both** build jobs:

``` yaml
needs:
  - build-backend
  - build-frontend
```

Therefore:

``` text
Build Backend ──────┐
                    ├──> Publish Backend
Build Frontend ─────┘

Build Backend ──────┐
                    ├──> Publish Frontend
Build Frontend ─────┘
```

The backend and frontend builds can run in parallel, which saves CI
time, but publishing waits until both have succeeded.

### Result

If either build fails:

``` text
Backend build   ❌
Frontend build  ✅

Publish backend  ⏭️
Publish frontend ⏭️
```

No Docker images are published.

The original workflow already used `needs` to make the publish jobs wait
for both build/test jobs.

------------------------------------------------------------------------

# 3. Problem: Keeping Only the Last 3 Successful Releases

The requirement was:

> Keep only the last 3 successful published backend and frontend
> releases and delete older versions.

A simple approach would be to retrieve all GHCR package versions, sort
them by creation time, keep three, and delete everything else.

### Why that approach was wrong

GHCR does not necessarily contain only Docker image releases.

A successful image publication can also create **untagged package
versions**, particularly because the workflow generates build provenance
attestations.

The workflow explicitly generates an artifact attestation after pushing
the image:

``` yaml
- name: Generate artifact attestation
  uses: actions/attest-build-provenance@v2
```

The package versions page therefore showed multiple versions for what
was effectively a single image publication:

``` text
Tagged image
Untagged artifact
Untagged artifact
...
```

If we simply kept the newest three package versions, we could
accidentally delete real releases while retaining unrelated/untagged
artifacts.

### Solution

We changed the retention logic to identify **actual releases by checking
whether the GHCR package version has container tags**.

Conceptually:

``` text
All GHCR versions
       │
       ├── Tagged versions       → actual releases
       │
       └── Untagged versions     → artifacts/attestations/etc.
```

Only tagged versions are counted when determining the three releases to
keep.

This is an important distinction:

> **3 package versions ≠ 3 releases.**

The workflow's Docker metadata creates tags such as branch/SHA/latest
tags, while the attestation is associated with the pushed image digest.

------------------------------------------------------------------------

# 4. Problem: The `gh api --slurp --jq` Error

During the first implementation of the retention logic, the workflow
failed with this error:

``` text
the --slurp option is not supported with --jq or --template
```

The problematic command was effectively:

``` bash
gh api --paginate --slurp "$API_PATH?per_page=100" --jq 'add'
```

### Why it failed

`gh api` does not allow `--slurp` to be combined with `--jq`.

### Solution

We changed the command so that pagination and JSON aggregation are
handled separately:

``` bash
VERSIONS="$(gh api --paginate "$API_PATH?per_page=100" | jq -s 'add')"
```

Here:

-   `gh api --paginate` retrieves all pages.
-   `jq -s 'add'` combines the returned JSON arrays.

This removed the CLI error and allowed the cleanup logic to process the
package versions.

------------------------------------------------------------------------

# 5. Problem: Cleanup Logic Was Initially in the Wrong Job

During an iteration of the workflow, the frontend retention step was
accidentally placed inside the backend publishing job.

This resulted in a backend job attempting to perform frontend cleanup.

### Why this was a problem

Backend and frontend are separate GHCR packages:

``` text
GHCR
├── devops-suite-backend
└── devops-suite-frontend
```

Each package needs its own cleanup operation.

### Solution

We separated the cleanup steps:

``` text
Publish Backend Image
        │
        └── Keep last 3 backend releases

Publish Frontend Image
        │
        └── Keep last 3 frontend releases
```

This ensures the backend cleanup operates only on the backend package
and the frontend cleanup operates only on the frontend package.

------------------------------------------------------------------------

# 6. Problem: Backend and Frontend Could Become Inconsistent

This was the most important architectural issue.

Suppose both application builds succeed:

``` text
Build Backend   ✅
Build Frontend  ✅
```

Then image publication starts.

Imagine:

``` text
Publish Backend   ❌
Publish Frontend  ✅
```

If the frontend immediately updates `latest`, the registry could end up
with:

``` text
Backend:  latest → previous commit
Frontend: latest → new commit
```

The two components would represent different releases.

For an application where frontend and backend are intended to be
released together, this is undesirable.

------------------------------------------------------------------------

# 7. Solution: Separate Publishing From Release Promotion

To solve the consistency problem, we introduced a **release promotion**
stage.

The idea is:

1.  Build and test both applications.
2.  Publish both images using immutable commit-based tags.
3.  Only after both images are successfully published, promote the
    release.
4.  Update the release tags such as `latest`.
5.  Run retention cleanup.

Conceptually:

``` text
                 ┌─────────────────────┐
                 │ Build & Test Backend │
                 └──────────┬──────────┘
                            │
                            │
                 ┌──────────▼──────────┐
                 │ Build & Test Frontend│
                 └──────────┬──────────┘
                            │
                     Both successful?
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
        Publish Backend        Publish Frontend
                 │                     │
                 └──────────┬──────────┘
                            ▼
                     Promote Release
                            │
                            ▼
                    Retention Cleanup
```

The key principle is:

> **Publishing an image does not automatically mean that the image is
> the current release.**

------------------------------------------------------------------------

# 8. Immutable Image Tags

During publication, images can be identified by the commit that produced
them.

For example:

``` text
backend:sha-abc123
frontend:sha-abc123
```

These tags provide a stable reference to the exact build.

The release promotion stage can then make the release tag point to the
successfully published images:

``` text
backend:latest   → backend:sha-abc123
frontend:latest  → frontend:sha-abc123
```

This creates a separation between:

-   **Immutable build artifacts**
-   **Current release pointers**

That separation is what makes the release process safer.

------------------------------------------------------------------------

# 9. What Happens When One Publish Fails?

Consider:

``` text
Build Backend    ✅
Build Frontend   ✅

Publish Backend  ❌
Publish Frontend ✅
```

The frontend image may exist under its immutable commit tag, but the
release promotion stage does not run because both publish jobs did not
succeed.

Therefore the existing release remains:

``` text
backend:latest   → previous release
frontend:latest  → previous release
```

The failed release does not become the new `latest`.

This prevents the common failure mode where one component advances while
the other remains on an older version.

------------------------------------------------------------------------

# 10. Why `Promote Release` Exists

The `Promote Release` job is effectively a **release gate**.

Its job is not to build the application.

Its job is not to run the application tests.

Its purpose is to say:

> Both images for this commit were successfully published, so this
> commit is now allowed to become the current release.

Therefore:

``` text
Build/Test
    ↓
Publish artifacts
    ↓
Release gate
    ↓
Promote to latest
```

This is a cleaner separation of responsibilities.

------------------------------------------------------------------------

# 11. Problem: Failed Publications Should Not Count Toward Retention

Another requirement was:

> Keep the last 3 successful published releases, not failed attempts.

A failed Docker build/push should never become one of the three retained
releases.

### Solution

Retention runs only after the relevant successful publication/release
process.

The cleanup logic determines releases from actual tagged package
versions rather than simply counting workflow runs.

Therefore a failed GitHub Actions run does not automatically become a
retained release.

------------------------------------------------------------------------

# 12. Problem: Attestation Creates Additional GHCR Versions

The workflow also uses:

``` yaml
actions/attest-build-provenance@v2
```

with:

``` yaml
push-to-registry: true
```

This provides build provenance information for the image.

However, it also means GHCR can show additional untagged package
versions.

This was initially confusing because the GHCR UI could show something
similar to:

``` text
2 tagged
3 untagged
```

even though only a small number of Docker images had actually been
released.

### Solution

The retention implementation was changed to distinguish:

``` text
Tagged package version
        ↓
Count as release

Untagged package version
        ↓
Do not count as release
```

This prevents attestation artifacts from consuming the three-release
retention allowance.

------------------------------------------------------------------------

# 13. Problem: Docker Image Names Must Be Lowercase

Docker/GHCR image names must use lowercase naming.

Repository names can contain uppercase characters.

### Solution

The workflow converts the repository name to lowercase before
constructing the image name.

Conceptually:

``` bash
echo "${GITHUB_REPOSITORY}" | tr '[:upper:]' '[:lower:]'
```

Then the image names become:

``` text
ghcr.io/<lowercase-repository>-backend
ghcr.io/<lowercase-repository>-frontend
```

The workflow contains explicit steps for deriving these lowercase image
names.

------------------------------------------------------------------------

# 14. Problem: GHCR Authentication and Permissions

Publishing to GHCR requires authentication and package write
permissions.

The publish jobs use:

``` yaml
permissions:
  contents: read
  packages: write
  attestations: write
  id-token: write
```

The registry login uses the GitHub Actions token:

``` yaml
username: ${{ github.actor }}
password: ${{ secrets.GITHUB_TOKEN }}
```

This allows the workflow to authenticate against GHCR and push the
images.

The additional permissions support the provenance attestation process.

------------------------------------------------------------------------

# 15. Final Architecture

The final architecture is designed around four responsibilities:

``` text
┌─────────────────────────────┐
│ 1. Build & Test             │
│                             │
│ Backend + Frontend          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 2. Publish Images           │
│                             │
│ Backend + Frontend          │
│ Immutable commit versions   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 3. Promote Release          │
│                             │
│ Only when both publishes    │
│ have succeeded              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ 4. Retention                │
│                             │
│ Keep 3 newest successful    │
│ tagged releases             │
└─────────────────────────────┘
```

------------------------------------------------------------------------

# 16. Final Failure Scenarios

## Scenario A --- Backend tests fail

``` text
Backend Build     ❌
Frontend Build    ✅

Publish Backend   ⏭️
Publish Frontend  ⏭️
Promote Release   ⏭️
```

No release is created.

------------------------------------------------------------------------

## Scenario B --- Frontend tests fail

``` text
Backend Build     ✅
Frontend Build    ❌

Publish Backend   ⏭️
Publish Frontend  ⏭️
Promote Release   ⏭️
```

No release is created.

------------------------------------------------------------------------

## Scenario C --- Backend image publication fails

``` text
Backend Build     ✅
Frontend Build    ✅

Publish Backend   ❌
Publish Frontend  ✅

Promote Release   ⏭️
```

The new frontend artifact does not become the current release.

------------------------------------------------------------------------

## Scenario D --- Both images publish successfully

``` text
Backend Build     ✅
Frontend Build    ✅

Publish Backend   ✅
Publish Frontend  ✅

Promote Release   ✅
Retention         ✅
```

The new commit becomes the current release.

------------------------------------------------------------------------

# 17. Main Lessons Learned

### 1. Do not equate package versions with releases

GHCR can contain images, attestations, and other package versions.

### 2. Do not update `latest` too early

Publishing an artifact and promoting a release are different operations.

### 3. Use immutable identifiers for artifacts

Commit/SHA-based image tags make it possible to identify exactly which
source produced an image.

### 4. Make release promotion depend on all required components

For a full-stack application, both backend and frontend should succeed
before the release is promoted.

### 5. Retention should operate on actual releases

Count tagged successful releases rather than blindly deleting package
versions based only on timestamps or package-version count.

### 6. Test the cleanup logic against real GHCR data

The GHCR UI revealed that a single publication can create multiple
package versions. This was important for discovering why the first
retention strategy was unsafe.

### 7. CI/CD should fail safely

A failure should preferably leave the existing working release untouched
rather than partially updating the application.

------------------------------------------------------------------------

# 18. Final Result

The CI/CD pipeline evolved from a straightforward:

``` text
Build → Publish
```

workflow into a safer release pipeline:

``` text
Build & Test
     ↓
Publish Immutable Images
     ↓
Verify Both Publications
     ↓
Promote Release
     ↓
Retain Last 3 Successful Releases
```

The most important improvement is that **an image being successfully
pushed is no longer the same thing as that image becoming the active
release**.

That separation gives the pipeline a much safer failure behavior and
makes the release process easier to reason about.
