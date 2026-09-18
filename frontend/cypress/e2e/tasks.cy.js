/// <reference types="cypress" />

const USER = {
  firstName: 'Task',
  lastName:  'Tester',
  email:     `cypress_tasks_${Date.now()}@example.com`,
  password:  'CypressTest1!',
};

const PROJECT_NAME = `E2E Tasks Project ${Date.now()}`;

describe('Task Board', () => {
  before(() => {
    cy.register(USER.firstName, USER.lastName, USER.email, USER.password);
  });

  beforeEach(() => {
    cy.login(USER.email, USER.password);
    // Navigate into the project board before each test
    cy.createProject(PROJECT_NAME);
    cy.contains(PROJECT_NAME).click();
    cy.url().should('match', /\/projects\/[0-9a-f-]+/);
  });

  // ── Board structure ────────────────────────────────────────────────────────
  it('renders all four Kanban columns', () => {
    cy.contains('Backlog').should('be.visible');
    cy.contains('To Do').should('be.visible');
    cy.contains('In Progress').should('be.visible');
    cy.contains('Done').should('be.visible');
  });

  it('shows a + button on each column header for admins/owners', () => {
    // The project creator is automatically OWNER — should see + buttons
    cy.get('button[title^="Add task to"]').should('have.length', 4);
  });

  // ── Add task ───────────────────────────────────────────────────────────────
  describe('Add task', () => {
    it('opens the Add Task modal when + is clicked on a column', () => {
      cy.get('button[title="Add task to To Do"]').click();
      cy.contains('Add Task').should('be.visible');
      cy.get('#task-title').should('be.visible');
    });

    it('closes the modal when Cancel is clicked', () => {
      cy.get('button[title="Add task to Backlog"]').click();
      cy.contains('button', 'Cancel').click();
      cy.get('#task-title').should('not.exist');
    });

    it('creates a task and shows it in the correct column', () => {
      const taskTitle = `My E2E Task ${Date.now()}`;
      cy.get('button[title="Add task to To Do"]').click();
      cy.get('#task-title').type(taskTitle);
      cy.contains('button', 'Add Task').click();
      // Task card should appear in the To Do column
      cy.contains(taskTitle).should('be.visible');
    });

    it('creates a task with a description and HIGH priority', () => {
      const taskTitle = `High Priority Task ${Date.now()}`;
      cy.get('button[title="Add task to Backlog"]').click();
      cy.get('#task-title').type(taskTitle);
      cy.get('#description').type('Important task description');
      cy.get('#priority').select('HIGH');
      cy.contains('button', 'Add Task').click();
      cy.contains(taskTitle).should('be.visible');
    });
  });

  // ── Task card interactions ─────────────────────────────────────────────────
  describe('Task card', () => {
    const TASK_TITLE = `Card Test Task ${Date.now()}`;

    beforeEach(() => {
      // Create a task to interact with
      cy.get('button[title="Add task to To Do"]').click();
      cy.get('#task-title').type(TASK_TITLE);
      cy.contains('button', 'Add Task').click();
      cy.contains(TASK_TITLE).should('be.visible');
    });

    it('clicking a task card opens the task detail modal', () => {
      cy.contains(TASK_TITLE).click();
      // Detail modal should appear (contains the task title prominently)
      cy.get('[role="dialog"], .modal, [data-testid="task-detail"]')
        .first()
        .should('be.visible');
      cy.get('body').should('contain', TASK_TITLE);
    });
  });
});
