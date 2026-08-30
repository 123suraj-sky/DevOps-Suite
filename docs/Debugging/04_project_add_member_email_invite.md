# 04 — Add Member Failure, Select Component Crash & Email Invitation Flow

## Symptoms

1. **Add Member Failed (400 Bad Request)**: When trying to add a project member by entering their email address in the Project Detail modal, the request failed with a 400 Bad Request / JSON deserialization error.
2. **UI Blank Screen on Modal Open**: Clicking "Add Member" caused the entire React UI to crash with:
   ```text
   Select.jsx:37 Uncaught TypeError: Cannot read properties of undefined (reading 'map')
       at Select (Select.jsx:37:18)
   ```
3. **No Invitation Fallback**: If an email was not registered on DevOps Suite, there was no way to invite the teammate via email.

---

## Root Causes

### 1. Request Payload & Validation Mismatch
- **Frontend**: The `ProjectDetailPage.jsx` component captured an email address (`memberEmail`) and passed it into `projectApi.addMember(projectId, memberEmail, role)`, which posted `{ userId: memberEmail, role }`.
- **Backend**: `ProjectDto.MemberRequest` defined `@NotNull private UUID userId;` and lacked an `email` field. When an email string (e.g. `member@example.com`) was submitted, Spring Boot failed to deserialize it into a `UUID`, returning `400 Bad Request`.
- **Service Layer**: `ProjectService.addMember` expected a `UUID memberUserId` directly and did not perform user lookup by email.

### 2. Missing `children` & Default Prop in `Select.jsx`
- The `Select` component in `src/components/common/Select.jsx` unconditionally executed `options.map(...)` without checking if `options` was passed or defaulting it.
- `ProjectDetailPage.jsx` and `TasksPage.jsx` used `<Select>` with child `<option>` elements rather than an `options` array prop. When `<Select>` rendered, `options` was `undefined`, triggering `Cannot read properties of undefined (reading 'map')` and crashing the React component tree.

---

## Fixes Implemented

### 1. Backend DTO, Controller & Service
- **`ProjectDto.java`**: Made `userId` optional and added `email` to `MemberRequest`:
  ```java
  @Data
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MemberRequest {
      @JsonAlias("user_id")
      private UUID userId;

      private String email;

      @NotBlank
      private String role;
  }
  ```
- **`ProjectService.java`**: Injected `UserRepository`. In `addMember`, if `memberUserId` is null, it resolves the user by looking up their email via `userRepository.findByEmail(email.trim().toLowerCase())`. If not found, it throws `ResourceNotFoundException("User not registered with email: " + email)`.
- **`ProjectController.java`**: Updated `POST /{projectId}/members` to forward `request.getEmail()` along with `request.getUserId()` to `ProjectService`.
- **`ProjectServiceTest.java`**: Added unit tests verifying member resolution by email and 404 response on unregistered users.

### 2. Frontend Component & Invitation UX
- **`Select.jsx`**: Added `options = []` and `children` support:
  ```jsx
  {options && options.length > 0
    ? options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))
    : children}
  ```
- **`projectApi.js`**: Updated `addMember` to support `{ email, role }` or `{ userId, role }` payloads seamlessly.
- **`ProjectDetailPage.jsx`**:
  - Sends `{ email: memberEmail, role: memberRole }`.
  - Catches 404 / unregistered user errors and displays a prompt in the modal offering to invite the colleague.
  - Clicking **"Send Email Invitation"** opens the user's default email client (`mailto:`) with:
    - **To:** `<recipient email>`
    - **Subject:** `Invitation to join <Project Name> on DevOps Suite`
    - **Body:** Formatted invitation text with the registration link (`/register`) and signed off with the current user's name:
      ```text
      Hi,

      I would like to invite you to join and collaborate on "<Project Name>" on DevOps Suite.

      Please create an account at <domain>/register using this email address to get access.

      Best regards,
      <Logged-in User Name>
      ```
