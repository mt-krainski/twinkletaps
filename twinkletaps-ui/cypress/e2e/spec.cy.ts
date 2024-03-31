describe('Login Page', () => {
  it('/ redirects to /login', () => {
    cy.visit('/');
    cy.url().should('eq', pathToUrl('/login'));
  });

  it('Successful Login Redirects to /', () => {
    cy.visit('/login');
    cy.wait(1000);
    cy.get('input[name="username"]').type('test-user');
    cy.get('input[name="password"]').type('local-dev');
    cy.get('button').contains('Login').click();
    cy.url().should('eq', pathToUrl('/'));
  });

  it('Can Log In and Log Out', () => {
    cy.visit('/login');
    cy.wait(1000);
    cy.get('input[name="username"]').type('test-user');
    cy.get('input[name="password"]').type('local-dev');
    cy.get('button').contains('Login').click();
    cy.url().should('eq', pathToUrl('/'));
    cy.wait(200);
    cy.get('button[name="userMenu"]').click();
    cy.get('button').contains('Logout').click();
    cy.url().should('eq', pathToUrl('/login'));
    cy.reload();
    cy.url().should('eq', pathToUrl('/login'));
  });
});

function pathToUrl(path: string): string {
  return Cypress.config().baseUrl + path;
}
