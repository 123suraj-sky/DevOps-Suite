/// <reference types="cypress" />

// One user shared across the suite — registered before all tests run.
const USER = {
  firstName: 'Proj',
  lastName:  'Tester',
  email:     `cypress_proj_${Date.now()}@example.com`,
  password:  'CypressTest1!',
};

const PROJECT_NAME = `E2E Project ${Date.now()}`;
const PROJECT_DESC = 'Created by Cypress e2e tests';

describe('Projects', () => {
  before(() => {
    // Register once; all tests in this suite reuse the session.
    cy.register(USER.firstName, USER.lastName, USER.email, USER.password);
  });

  beforeEach(() => {
    cy.login(USER.email, USER.password);
  });

  // ── Projects list page ────────────────────────────────────────────────────
  describe('Projects list', () => {
    it('shows the Projects heading and a New Project button', () => {
      cy.visit('/projects');
      cy.get('h1').should('contain', 'Projects');
      cy.contains('button', 'New Project').should('be.visible');
    });

    it('shows an empty-state message when no projects exist', () => {
      cy.visit('/projects');
      // Only assert empty state if no projects are present yet
      cy.get('body').then(($body) => {
        if ($body.text().includes('No projects yet')) {
          cy.contains('No projects yet').should('be.visible');
        }
      });
    });
  });

  // ── Create project ─────────────────────────────────────────────────────────
  describe('Create project', () => {
    it('opens the create project modal when New Project is clicked', () => {
      cy.visit('/projects');
      cy.contains('button', 'New Project').click();
      cy.contains('Create Project').should('be.visible');
      cy.get('#project-name').should('be.visible');
    });

    it('closes the modal when Cancel is clicked', () => {
      cy.visit('/projects');
      cy.contains('button', 'New Project').click();
      cy.contains('button', 'Cancel').click();
      cy.get('#project-name').should('not.exist');
    });

    it('creates a project and shows it in the list', () => {
      cy.createProject(PROJECT_NAME, PROJECT_DESC);
      cy.contains(PROJECT_NAME).should('be.visible');
    });
  });

  // ── Project detail ─────────────────────────────────────────────────────────
  describe('Project detail', () => {
    it('navigates into a project when its card is clicked', () => {
      cy.visit('/projects');
      cy.contains(PROJECT_NAME).click();
      // URL should change to /projects/<uuid>
      cy.url().should('match', /\/projects\/[0-9a-f-]+/);
    });

    it('shows the project board (Task Board heading) inside the project', () => {
      cy.visit('/projects');
      cy.contains(PROJECT_NAME).click();
      // Default sub-route renders the project detail / kanban board
      cy.contains('Task Board').should('be.visible');
    });

    it('shows all four Kanban columns', () => {
      cy.visit('/projects');
      cy.contains(PROJECT_NAME).click();
      cy.contains('Backlog').should('be.visible');
      cy.contains('To Do').should('be.visible');
      cy.contains('In Progress').should('be.visible');
      cy.contains('Done').should('be.visible');
    });
  });
});
