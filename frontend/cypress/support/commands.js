/// <reference types="cypress" />

// ── cy.login(email, password) ──────────────────────────────────────────────
// Visits /login, fills the form, submits, and waits for redirect to /.
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password, { log: false });
  cy.get('button[type="submit"]').click();
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
});

// ── cy.register(firstName, lastName, email, password) ─────────────────────
// Fills the registration form and submits. On success the app redirects to /.
Cypress.Commands.add('register', (firstName, lastName, email, password) => {
  cy.visit('/register');
  cy.get('#first-name').type(firstName);
  cy.get('#last-name').type(lastName);
  cy.get('#email').type(email);
  cy.get('#password').type(password, { log: false });
  cy.get('#confirm-password').type(password, { log: false });
  cy.get('button[type="submit"]').should('not.be.disabled').click();
  cy.url().should('eq', Cypress.config('baseUrl') + '/');
});

// ── cy.createProject(name, description) ───────────────────────────────────
// Must be called while logged in on any page with the sidebar/nav visible.
// Opens the "New Project" modal, fills it, submits, and waits for the card.
Cypress.Commands.add('createProject', (name, description = '') => {
  cy.visit('/projects');
  cy.contains('button', 'New Project').click();
  // Modal uses Input with label="Project Name" → id="project-name"
  cy.get('#project-name').type(name);
  if (description) {
    cy.get('#description').type(description);
  }
  cy.contains('button', 'Create').click();
  cy.contains(name).should('exist');
});
