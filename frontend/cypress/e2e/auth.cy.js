/// <reference types="cypress" />

// Shared test user — registered once in the first test, reused in the rest.
const USER = {
  firstName: 'Cypress',
  lastName:  'Tester',
  email:     `cypress_auth_${Date.now()}@example.com`,
  password:  'CypressTest1!',
};

describe('Authentication', () => {

  // ── Registration ──────────────────────────────────────────────────────────
  describe('Register', () => {
    it('shows the registration form', () => {
      cy.visit('/register');
      cy.get('h1').should('contain', 'DevOps Suite');
      cy.get('#first-name').should('exist');
      cy.get('#last-name').should('exist');
      cy.get('#email').should('exist');
      cy.get('#password').should('exist');
      cy.get('#confirm-password').should('exist');
      cy.get('button[type="submit"]').should('exist');
    });

    it('disables the submit button until password requirements are met', () => {
      cy.visit('/register');
      cy.get('button[type="submit"]').should('be.disabled');
      // Weak password — button stays disabled
      cy.get('#password').type('weak');
      cy.get('#confirm-password').type('weak');
      cy.get('button[type="submit"]').should('be.disabled');
      // Strong password matching — button enables
      cy.get('#password').clear().type(USER.password);
      cy.get('#confirm-password').clear().type(USER.password);
      cy.get('button[type="submit"]').should('not.be.disabled');
    });

    it('shows mismatch hint when confirm password does not match', () => {
      cy.visit('/register');
      cy.get('#password').type(USER.password);
      cy.get('#confirm-password').type('WrongPass1!');
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('registers a new user and redirects to dashboard', () => {
      cy.register(USER.firstName, USER.lastName, USER.email, USER.password);
      // After registration the app redirects to / (dashboard)
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
    });

    it('shows an error when registering with an already-used email', () => {
      cy.visit('/register');
      cy.get('#first-name').type(USER.firstName);
      cy.get('#last-name').type(USER.lastName);
      cy.get('#email').type(USER.email);
      cy.get('#password').type(USER.password);
      cy.get('#confirm-password').type(USER.password);
      cy.get('button[type="submit"]').click();
      cy.contains('already registered', { matchCase: false }).should('be.visible');
    });

    it('navigates to login page via "Sign in" link', () => {
      cy.visit('/register');
      cy.contains('Sign in').click();
      cy.url().should('include', '/login');
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  describe('Login', () => {
    it('shows the login form', () => {
      cy.visit('/login');
      cy.get('h1').should('contain', 'DevOps Suite');
      cy.get('#email').should('exist');
      cy.get('#password').should('exist');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('shows an error on wrong password', () => {
      cy.visit('/login');
      cy.get('#email').type(USER.email);
      cy.get('#password').type('WrongPass99!');
      cy.get('button[type="submit"]').click();
      cy.contains('Incorrect email or password', { matchCase: false }).should('be.visible');
    });

    it('shows an error on unknown email', () => {
      cy.visit('/login');
      cy.get('#email').type('nobody_' + Date.now() + '@example.com');
      cy.get('#password').type('SomePass1!');
      cy.get('button[type="submit"]').click();
      cy.contains('Incorrect email or password', { matchCase: false }).should('be.visible');
    });

    it('logs in successfully and redirects to dashboard', () => {
      cy.login(USER.email, USER.password);
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
    });

    it('navigates to register page via "Sign up" link', () => {
      cy.visit('/login');
      cy.contains('Sign up').click();
      cy.url().should('include', '/register');
    });

    it('has a Forgot password link that navigates correctly', () => {
      cy.visit('/login');
      cy.contains('Forgot password').click();
      cy.url().should('include', '/forgot-password');
    });

    it('redirects authenticated users away from /login', () => {
      cy.login(USER.email, USER.password);
      cy.visit('/login');
      cy.url().should('eq', Cypress.config('baseUrl') + '/');
    });
  });

  // ── Forgot Password ───────────────────────────────────────────────────────
  describe('Forgot Password', () => {
    it('shows the forgot password form', () => {
      cy.visit('/forgot-password');
      cy.contains('Reset your password').should('be.visible');
      cy.get('#email').should('exist');
      cy.contains('button', 'Send reset link').should('exist');
    });

    it('shows a generic success message for a registered email', () => {
      cy.visit('/forgot-password');
      cy.get('#email').type(USER.email);
      cy.contains('button', 'Send reset link').click();
      cy.contains('If that email is registered').should('be.visible');
    });

    it('shows a generic success message even for an unknown email (no enumeration)', () => {
      cy.visit('/forgot-password');
      cy.get('#email').type('unknown_' + Date.now() + '@example.com');
      cy.contains('button', 'Send reset link').click();
      cy.contains('If that email is registered').should('be.visible');
    });

    it('navigates back to login via "Back to sign in" link', () => {
      cy.visit('/forgot-password');
      cy.contains('Back to sign in').click();
      cy.url().should('include', '/login');
    });
  });

  // ── Reset Password page ───────────────────────────────────────────────────
  describe('Reset Password page', () => {
    it('shows an invalid-link message when no token is in the URL', () => {
      cy.visit('/reset-password');
      cy.contains('Invalid reset link').should('be.visible');
      cy.contains('Request a new reset link').should('be.visible');
    });

    it('shows the reset form when a token is present in the URL', () => {
      cy.visit('/reset-password?token=fake-token-for-ui-test');
      cy.contains('Choose a new password').should('be.visible');
      cy.get('#new-password').should('exist');
      cy.get('#confirm-new-password').should('exist');
    });

    it('disables submit until passwords are valid and matching', () => {
      cy.visit('/reset-password?token=fake-token-for-ui-test');
      cy.get('button[type="submit"]').should('be.disabled');
      cy.get('#new-password').type('WeakPass');
      cy.get('#confirm-new-password').type('WeakPass');
      cy.get('button[type="submit"]').should('be.disabled');
      cy.get('#new-password').clear().type('StrongPass1!');
      cy.get('#confirm-new-password').clear().type('StrongPass1!');
      cy.get('button[type="submit"]').should('not.be.disabled');
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  describe('Logout', () => {
    it('logs out and redirects to /login', () => {
      cy.login(USER.email, USER.password);
      // Open the user avatar dropdown in the header and click Sign out
      cy.get('header').find('button[title]').last().click();
      cy.contains('Sign out').click();
      cy.url().should('include', '/login');
    });

    it('redirects unauthenticated users from protected routes to /login', () => {
      // Clear any stored tokens so the user is logged out
      cy.clearLocalStorage();
      cy.visit('/projects');
      cy.url().should('include', '/login');
    });
  });
});
