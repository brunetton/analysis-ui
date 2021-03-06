const tempPrefix = Cypress.env('dataPrefix') + 'temp'
const createTempRegionName = () => tempPrefix + Date.now()

const getName = () => cy.findByLabelText(/Region Name/)
const getDesc = () => cy.findByLabelText(/Description/)
const getNorth = () => cy.findByLabelText(/North bound/)
const getSouth = () => cy.findByLabelText(/South bound/)
const getEast = () => cy.findByLabelText(/East bound/)
const getWest = () => cy.findByLabelText(/West bound/)
const getCreate = () => cy.findByRole('button', {name: /Set up a new region/})
const getSave = () => cy.findByRole('button', {name: /Save changes/})
const getSearch = () => cy.get('input#react-select-2-input').as('search')

/**
 * Scratch region
 */
const regionData = {
  description: 'Cypress stratch testing region',
  searchTerm: 'covington',
  foundName: 'Covington, Kentucky, United States',
  north: 39.1199,
  south: 38.9268,
  east: -84.3592,
  west: -84.706,
  center: [39.02335, -84.5326]
}

/**
 * Manipulate the coordinate inputs to ensure proper behavior
 */
function testInvalidCoordinates() {
  // try to set south == north
  getNorth()
    .invoke('val')
    .then((northVal) => {
      getSouth().clear().type(northVal).blur()
      getSouth().should((south) => {
        expect(Number(south[0].value)).to.be.lessThan(Number(northVal))
      })
    })
  // try to set east < west
  getEast()
    .invoke('val')
    .then((eastVal) => {
      getWest()
        .clear()
        .type(Number(eastVal) + 1)
        .blur()
      getWest().should((west) => {
        expect(Number(west[0].value)).to.be.lessThan(Number(eastVal))
      })
    })
  // try to enter a non-numeric value
  // form should revert to previous numeric value
  getWest().clear().type('letters').blur()
  getWest().should((west) => {
    assert.isNotNaN(Number(west[0].value))
  })
}

/**
 * Delete the currently open region. Must be already on the region settings page.
 */
function deleteThisRegion() {
  // Delete region
  cy.findByText(/Delete this region/).click()
  cy.findByText(/Confirm: Delete this region/).click()
  return cy.findByRole('dialog').should('not.exist')
}

/**
 * Clean up any temp regions created by this file that were not deleted.
 * Useful for local development and running of tests.
 */
function deleteOldScratchRegions() {
  cy.visit('/')
  cy.get('[class*="Skeleton"]').should('not.exist') // regions loaded
  return cy
    .get('body')
    .then(($body) =>
      $body
        .find('button')
        .filter((_, el) => Cypress.$(el).text().startsWith(tempPrefix))
    )
    .then((regions) => {
      if (regions.length > 0) {
        cy.wrap(regions[0]).click()
        cy.navTo('region settings')
        deleteThisRegion()
        deleteOldScratchRegions()
      }
    })
}

describe('Regions', () => {
  before(() => {
    deleteOldScratchRegions()
  })

  it('CRUD', function () {
    cy.visit('/')
    cy.findByText('Set up a new region').click()
    cy.location('pathname').should('eq', '/regions/create')

    // Test invalid coordinates in the create form
    testInvalidCoordinates()

    // Test geocoder search
    const testLocations = [
      {
        searchTerm: 'cincinnati',
        findText: /^Cincinnati, Ohio/,
        lat: 39.1,
        lon: -84.5
      },
      {
        searchTerm: 'tulsa',
        findText: /^Tulsa, Oklahoma/,
        lat: 36.1,
        lon: -95.9
      },
      {
        searchTerm: 'greenwich',
        findText: /^Greenwich,.* England/,
        lat: 51.5,
        lon: 0
      }
    ]
    const maxOffset = 10000 // meters
    testLocations.forEach((r) => {
      getSearch().focus().clear().type(r.searchTerm)
      cy.findByText(r.findText).click()
      cy.mapCenteredOn([r.lat, r.lon], maxOffset)
    })

    // Create a region
    const regionName = createTempRegionName()
    // Enter region name and description
    getName().type(regionName)
    getDesc().type(regionData.description)
    // search for region by name
    getSearch().focus().clear().type(regionData.searchTerm)
    cy.findByText(regionData.foundName).click()
    cy.mapCenteredOn(regionData.center, 10000)
    // Enter exact coordinates
    getNorth().clear().type(regionData.north)
    getSouth().clear().type(regionData.south)
    getEast().clear().type(regionData.east)
    getWest().clear().type(regionData.west)
    // Create the region
    getCreate().click()
    cy.navComplete()
    // should redirect to a region with no bundles
    cy.location('pathname').should('match', /regions\/.{24}$/)
    cy.contains('Upload a new Network Bundle')
    // Region is listed in main regions menu
    cy.navTo('Regions')
    cy.findByText(regionName).click()
    cy.navComplete()
    cy.location('pathname').should('match', /regions\/.{24}$/)
    // region settings are saved correctly
    cy.navTo('Region Settings')
    // check setting values
    getName().should('have.value', regionName)
    getDesc().should('have.value', regionData.description)
    // coordinate values are rounded to match analysis grid
    getNorth()
      .invoke('val')
      .then((coord) => cy.isWithin(coord, regionData.north, 0.02))
    getSouth()
      .invoke('val')
      .then((coord) => cy.isWithin(coord, regionData.south, 0.02))
    getEast()
      .invoke('val')
      .then((coord) => cy.isWithin(coord, regionData.east, 0.02))
    getWest()
      .invoke('val')
      .then((coord) => cy.isWithin(coord, regionData.west, 0.02))
    cy.mapCenteredOn(regionData.center, 10000)
    getSave().should('be.disabled')

    // Run the coordinate tests on the edit page
    testInvalidCoordinates()

    // update something and verify save
    const newDescription = 'This text has just been updated!'
    const newName = createTempRegionName()
    getDesc().clear().type(newDescription)
    getName().clear().type(newName)
    getSave().should('be.enabled').click()
    cy.navTo('Regions')
    cy.findByText(newName).click()
    cy.navComplete()
    cy.navTo('Region Settings') // will go to bundle page otherwise
    getDesc().should('have.value', newDescription)
    getName().should('have.value', newName)

    // From region settings
    deleteThisRegion()

    // should go back to home page
    cy.location('pathname').should('eq', '/')
    cy.contains('Set up a new region')
    cy.findByText(newName).should('not.exist')
  })
})
