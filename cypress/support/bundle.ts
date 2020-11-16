Cypress.Commands.add('createBundle', function (
  name: string,
  gtfsFilePath: string,
  pbfFilePath: string
): Cypress.Chainable<string> {
  Cypress.log({
    displayName: 'creating',
    message: 'bundle'
  })

  cy.navTo('network bundles')
  cy.findByText(/Create .* bundle/).click()
  cy.location('pathname').should('match', /\/bundles\/create$/)
  cy.findByLabelText(/Network bundle name/i).type(name, {delay: 0})
  cy.findByText(/Upload new OpenStreetMap/i).click()
  cy.findByLabelText(/Select PBF file/i).attachFile({
    filePath: pbfFilePath,
    encoding: 'base64',
    mimeType: 'application/octet-stream'
  })
  cy.findByText(/Upload new GTFS/i).click()
  cy.findByLabelText(/Select .*GTFS/i).attachFile({
    filePath: gtfsFilePath,
    encoding: 'base64',
    mimeType: 'application/octet-stream'
  })
  cy.findByRole('button', {name: /Create/i}).click()
  cy.findByText(/Processing/)
  cy.findByText(/Processing/, {timeout: 240000}).should('not.exist')

  // go back and grab the id
  cy.navTo('network bundles')
  cy.findByLabelText(/or select an existing one/)
    .click({force: true})
    .type(name + '{enter}')

  return cy
    .location('pathname')
    .should('match', /bundles\/\w{24}$/)
    .then((path): string => path.match(/\w{24}$/)[0])
})