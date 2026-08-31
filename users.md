<style>
  /* 1. Reset the counter named "row-number" at the start of every table */
  table tbody {
    counter-reset: row-number;
  }

  /* 2. Increment the counter for every table row in the body */
  table tbody tr {
    counter-increment: row-number;
  }

  /* 3. Display the counter value in the first column of each row */
  table tbody tr td:first-child::before {
    content: counter(row-number);
  }
</style>

## Users
|S.No.|Email|Password|
|---|---|---|
||suraj@gmail.com|Test@1234|
||kumar@gmail.com|Test@1234|

## Admin
|S.No.|Email|Password|
|---|---|---|
||admin@admin.com|admin|

