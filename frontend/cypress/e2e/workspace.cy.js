describe('DevOps Suite Workspace Flow', () => {
  const testEmail = `user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const projectName = `New E2E Project ${Date.now()}`;

  it('performs full user lifecycle: register, login, project creation, task management, and code execution', () => {
    // 1. Registration
    cy.visit('/register');
    cy.get('input[placeholder*="Name"]').type('E2E Tester');
    cy.get('input[type="email"]').type(testEmail);
    cy.get('input[type="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/login');

    // 2. Login
    cy.get('input[type="email"]').type(testEmail);
    cy.get('input[type="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/projects');

    // 3. Create Project
    cy.contains('Create Project').click();
    cy.get('input[name="name"]').type(projectName);
    cy.get('textarea[name="description"]').type('E2E project workspace details');
    cy.get('button').contains('Create').click();
    cy.contains(projectName).should('exist');

    // 4. Navigate into Kanban Board
    cy.contains(projectName).click();
    cy.url().should('include', '/kanban');

    // 5. Add a task
    cy.contains('Add Task').first().click();
    cy.get('input[name="title"]').type('E2E Test Task');
    cy.get('textarea[name="description"]').type('Description of E2E task');
    cy.get('button').contains('Save').click();
    cy.contains('E2E Test Task').should('exist');

    // 6. Navigate to Code Editor Page
    cy.contains('Code Editor').click();
    cy.url().should('include', '/editor');

    // 7. Verify Monaco and Run Code
    cy.get('select').select('python');
    cy.contains('Run Code').click();
    cy.contains('Executing sandbox code...').should('exist');
  });
});
