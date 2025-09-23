describe('UI Tests for ComparisonChart and Correlations', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display ComparisonChart with rolling averages and dual Y-axis', () => {
    // Navigate to Overview page where ComparisonChart is used
    cy.contains('Overview').click();

    // Check for chart title
    cy.contains('Comparison: Before vs After Feature Engineering').should('be.visible');

    // Check for legend labels
    cy.contains('Before Feature Engineering').should('be.visible');
    cy.contains('After Feature Engineering').should('be.visible');
    cy.contains('3-Day Rolling Average').should('be.visible');
    cy.contains('7-Day Rolling Average').should('be.visible');

    // Check that chart canvas exists
    cy.get('canvas').should('exist');
  });

  it('should navigate to Correlations page and display heatmap and data', () => {
    cy.contains('Correlations').click();

    // Check for Correlation Heatmap title
    cy.contains('Correlation Heatmap').should('be.visible');

    // Check for Correlation Matrix table
    cy.get('table').should('exist');

    // Check for Key Insights section
    cy.contains('Key Insights').should('be.visible');

    // Check for Distribution Analysis section
    cy.contains('Distribution Analysis').should('be.visible');
  });
});
