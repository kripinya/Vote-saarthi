describe('Vote Saarthi E2E Flow', () => {
  it('should successfully load the login page and authenticate', () => {
    // Visit the home page
    cy.visit('/');

    // Ensure page loaded
    cy.contains('Government of India');

    // Type a valid voter ID and submit
    cy.get('#voterId').type('ABC1234567');
    cy.get('#loginBtn').click();

    // Verify successful login
    cy.url().should('include', '/dashboard');
    cy.contains('Dashboard');
  });
});
