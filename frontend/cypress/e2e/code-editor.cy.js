/// <reference types="cypress" />

const USER = {
  firstName: 'Code',
  lastName:  'Tester',
  email:     `cypress_code_${Date.now()}@example.com`,
  password:  'CypressTest1!',
};

const PROJECT_NAME = `E2E Code Project ${Date.now()}`;

describe('Code Editor (IDE)', () => {
  before(() => {
    cy.register(USER.firstName, USER.lastName, USER.email, USER.password);
  });

  beforeEach(() => {
    cy.login(USER.email, USER.password);
    // Navigate to the project's IDE tab
    cy.createProject(PROJECT_NAME);
    cy.contains(PROJECT_NAME).click();
    cy.url().should('match', /\/projects\/[0-9a-f-]+/);
    // Click the Code/IDE tab in the project layout
    cy.contains('a', /Code|IDE/i).click();
    cy.url().should('match', /\/projects\/[0-9a-f-]+\/code/);
  });

  // ── IDE layout ─────────────────────────────────────────────────────────────
  describe('IDE layout', () => {
    it('renders the file explorer panel', () => {
      cy.get('[class*="252526"], [class*="explorer"], [aria-label*="explorer"]')
        .should('exist');
    });

    it('renders the Run button (disabled when no file is open)', () => {
      cy.get('button[title="No runnable file open"]').should('exist');
    });

    it('renders the Full screen button', () => {
      cy.contains('button', 'Full screen').should('exist');
    });
  });

  // ── File creation ──────────────────────────────────────────────────────────
  describe('File operations', () => {
    it('can create a new Python file via the explorer', () => {
      // The new-file button in FileExplorer has title containing "New File"
      cy.get('button[title*="New File"], button[title*="new file"]').first().click();
      // An inline input appears — type the filename
      cy.get('input[placeholder*="filename"], input[aria-label*="file name"], input[placeholder*="name"]')
        .first()
        .type('hello.py{enter}');
      // Tab should open for hello.py
      cy.contains('hello.py').should('be.visible');
    });
  });

  // ── Code execution ─────────────────────────────────────────────────────────
  describe('Code execution', () => {
    beforeEach(() => {
      // Create a Python file and type code into it
      cy.get('button[title*="New File"], button[title*="new file"]').first().click();
      cy.get('input[placeholder*="filename"], input[aria-label*="file name"], input[placeholder*="name"]')
        .first()
        .type(`run_test_${Date.now()}.py{enter}`);
      // Wait for Monaco to mount and type into the editor content area
      cy.get('.monaco-editor .view-lines').first().click().type('print("hello from cypress")');
    });

    it('enables the Run button after a runnable file is opened', () => {
      cy.get('button[title="Run active file"]').should('exist').and('not.be.disabled');
    });

    it('executes code and shows output in the output panel', () => {
      cy.get('button[title="Run active file"]').click();
      // Button switches to running state
      cy.contains('Running', { timeout: 5000 }).should('exist');
      // Wait for execution to complete (up to 40s for cold Docker start)
      cy.contains('hello from cypress', { timeout: 40000 }).should('be.visible');
    });

    it('shows exit code 0 for successful execution', () => {
      cy.get('button[title="Run active file"]').click();
      cy.contains('hello from cypress', { timeout: 40000 }).should('be.visible');
      // Output panel shows exit code
      cy.contains(/exit.*0|exited.*0/i).should('be.visible');
    });
  });
});
