describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('renders the login form', () => {
    cy.get('h1').should('contain', 'DevOps Suite');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button[type="submit"]').should('contain', 'Sign In');
  });

  it('shows error on invalid credentials', () => {
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
  });

  it('navigates to register page', () => {
    cy.contains('Sign up').click();
    cy.url().should('include', '/register');
  });
});
