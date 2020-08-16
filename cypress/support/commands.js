import '@testing-library/cypress/add-commands'
import 'cypress-file-upload'
import {addMatchImageSnapshotCommand} from 'cypress-image-snapshot/command'

addMatchImageSnapshotCommand({
  failureThresholdType: 'percent',
  failureThreshold: 0.05 // allow up to a 5% image diff
})

// Persist the user cookie across sessions
Cypress.Cookies.defaults({
  whitelist: ['user']
})

const prefix = Cypress.env('dataPrefix')
const regionName = Cypress.env('region')
const regionFixture = `regions/${regionName}.json`
// used to store object UUIDs between tests to avoid needless ui interaction
export const pseudoFixture = `cypress/fixtures/regions/.${regionName}.json`
const unlog = {log: false}

// Wait until the page has finished loading
Cypress.Commands.add('navComplete', () => {
  cy.get('#sidebar-spinner', unlog).should('not.exist')
  Cypress.log({name: 'Navigation complete'})
})

// For easy use inside tests
Cypress.Commands.add('getRegionFixture', () => cy.fixture(regionFixture))

// Check if a floating point number is within a certain tolerance
Cypress.Commands.add('isWithin', (f1, f2, tolerance = 0) => {
  cy.wrap(Math.abs(Number(f1) - Number(f2)) <= tolerance).should('be.true')
})

// Recursive setup
Cypress.Commands.add('setup', (entity) => setup(entity))

function setup(entity) {
  const idKey = entity + 'Id'
  cy.task('touch', pseudoFixture)
  return cy.readFile(pseudoFixture).then((storedVals) => {
    if (idKey in storedVals) {
      // thing exists; navigate to it
      switch (entity) {
        case 'region':
          cy.visit(`/regions/${storedVals.regionId}`)
          cy.navComplete()
          return cy.contains(/Create new Project|Upload a .* Bundle/i)
        case 'bundle':
          cy.visit(
            `/regions/${storedVals.regionId}/bundles/${storedVals.bundleId}`
          )
          cy.navComplete()
          return cy.contains(/create a new network bundle/i)
        case 'opportunities':
          cy.visit(`/regions/${storedVals.regionId}/opportunities`)
          cy.navComplete()
          return cy.contains(/Upload a new dataset/i)
        case 'project':
          cy.visit(
            `/regions/${storedVals.regionId}/projects/${storedVals.projectId}/modifications`
          )
          cy.navComplete()
          return cy.contains(/Create a modification/i)
        case 'analysis':
          cy.visit(
            `/regions/${storedVals.regionId}/regional?analysisId=${storedVals.analysisId}`
          )
          cy.navComplete()
          return cy.contains(/Aggregate results to/i)
      }
      // if the entity didn't already exist, recurse through all dependencies
    } else if (entity === 'region') {
      return createNewRegion()
    } else if (entity === 'bundle') {
      return setup('region').then(() => createNewBundle())
    } else if (entity === 'opportunities') {
      return setup('region').then(() => createNewOpportunities())
    } else if (entity === 'project') {
      return setup('bundle').then(() => createNewProject())
    } else if (entity === 'analysis') {
      return setup('project').then(() => createNewAnalysis())
    }
  })
}

function stash(key, val) {
  cy.readFile(pseudoFixture).then((contents) => {
    contents = {...contents, [key]: val}
    cy.writeFile(pseudoFixture, contents)
  })
}

function createNewAnalysis() {
  return ''
}

function createNewOpportunities() {
  return cy.fixture(regionFixture).then((region) => {
    let opportunity = region.opportunities.grid
    let oppName = `${prefix}default_opportunities`
    cy.navTo('Opportunity Datasets')
    cy.findByText(/Upload a new dataset/i).click()
    cy.findByPlaceholderText(/^Opportunity dataset/i).type(oppName)
    cy.findByLabelText(/Select opportunity dataset/).attachFile({
      filePath: opportunity.file,
      encoding: 'base64'
    })
    cy.get('a.btn')
      .contains(/Upload/)
      .click()
    cy.navComplete()
    // find the message showing this upload is complete
    cy.contains(new RegExp(oppName + ' \\(DONE\\)'), {timeout: 5000})
      .parent()
      .parent()
      .as('notice')
    // check number of fields uploaded
    cy.get('@notice').contains(/Finished uploading 1 feature/i)
    // close the message
    cy.get('@notice').findByRole('button', /x/).click()
    // now grab the ID
    cy.findByText(/Select\.\.\./)
      .click()
      .type(`${oppName} {enter}`)
    return cy
      .location('href')
      .should('match', /.*DatasetId=\w{24}$/)
      .then((href) => {
        stash('opportunitiesId', href.match(/\w{24}$/)[0])
      })
  })
}

function createNewRegion() {
  cy.visit('/regions/create')
  cy.findByPlaceholderText('Region Name').type(prefix + regionName, {delay: 0})
  cy.fixture(regionFixture).then((region) => {
    cy.findByLabelText(/North bound/)
      .clear()
      .type(region.north, {delay: 1})
    cy.findByLabelText(/South bound/)
      .clear()
      .type(region.south, {delay: 1})
    cy.findByLabelText(/West bound/)
      .clear()
      .type(region.west, {delay: 1})
    cy.findByLabelText(/East bound/)
      .clear()
      .type(region.east, {delay: 1})
  })
  cy.findByRole('button', {name: /Set up a new region/}).click()
  cy.navComplete()
  cy.contains(/Upload a new network bundle|create new project/i)
  // store the region UUID for later
  return cy
    .location('pathname')
    .should('match', /regions\/\w{24}$/)
    .then((path) => {
      stash('regionId', path.match(/\w{24}$/)[0])
    })
}

function createNewBundle() {
  let bundleName = prefix + regionName + ' bundle'
  cy.navTo('Network Bundles')
  cy.findByText(/Create .* bundle/).click()
  cy.location('pathname').should('match', /\/bundles\/create$/)
  cy.findByLabelText(/Network bundle name/i).type(bundleName, {delay: 1})
  cy.findByText(/Upload new OpenStreetMap/i).click()
  cy.fixture(regionFixture).then((region) => {
    cy.findByLabelText(/Select PBF file/i).attachFile({
      filePath: region.PBFfile,
      encoding: 'base64',
      mimeType: 'application/octet-stream'
    })
    cy.findByText(/Upload new GTFS/i).click()
    cy.findByLabelText(/Select .*GTFS/i).attachFile({
      filePath: region.GTFSfile,
      encoding: 'base64',
      mimeType: 'application/octet-stream'
    })
  })
  cy.findByRole('button', {name: /Create/i}).click()
  cy.findByText(/Processing/)
  cy.findByText(/Processing/, {timeout: 30000}).should('not.exist')
  // go back and grab the UUID
  cy.navTo('Network Bundles')
  cy.findByLabelText(/or select an existing one/)
    .click({force: true})
    .type(bundleName + '{enter}')
  return cy
    .location('pathname')
    .should('match', /bundles\/\w{24}$/)
    .then((path) => {
      stash('bundleId', path.match(/\w{24}$/)[0])
    })
}

function createNewProject() {
  const projectName = prefix + regionName + ' project'
  const bundleName = prefix + regionName + ' bundle'
  cy.navTo('Projects')
  cy.findByText(/Create new Project/i).click()
  cy.findByLabelText(/Project name/).type(projectName)
  cy.findByLabelText(/Associated network bundle/i).click()
  cy.findByText(bundleName).click()
  cy.findByText(/^Create$/).click()

  // store the projectId
  return cy
    .location('pathname', unlog)
    .should('match', /regions\/\w{24}\/projects\/\w{24}\/modifications$/) // wait until the location has changed
    .then((path) => {
      stash('projectId', path.match(/\w{24}/g)[1])
    })
}

Cypress.Commands.add('deleteProject', (projectName) => {
  cy.navTo('Projects')
  cy.get('body').then((body) => {
    if (body.text().includes(projectName)) {
      cy.findByText(projectName).click()
      cy.get('svg[data-icon="cog"]').click()
      cy.findByText(/Delete project/i).click()
    } else {
      // no such project - nothing to delete
    }
  })
})

Cypress.Commands.add('deleteScenario', (scenarioName) => {
  // can be called when editing modifications
  cy.navTo('Edit Modifications')
  // open the scenario panel if it isn't already
  cy.contains('Scenarios')
    .parent()
    .as('panel')
    .then((panel) => {
      if (!panel.text().includes('Create a scenario')) {
        cy.get(panel).click()
      }
    })
  cy.get('@panel')
    .contains(scenarioName)
    .findByTitle(/Delete this scenario/)
    .click()
})

Cypress.Commands.add('navTo', (menuItemTitle) => {
  // Navigate to a page using one of the main (leftmost) menu items
  // and wait until at least part of the page is loaded.
  const pages = {
    regions: {lookFor: /Set up a new region/i},
    'region settings': {lookFor: /Delete this region/i},
    projects: {lookFor: /Create new Project|Upload a .* Bundle/i},
    'network bundles': {lookFor: /Create a new network bundle/i},
    'opportunity datasets': {lookFor: /Upload a new dataset/i},
    'edit modifications': {
      lookFor: /create new project|create a modification/i
    },
    analyze: {lookFor: /Comparison Project/i},
    'regional analyses': {lookFor: /Regional Analyses/i}
  }
  const title = menuItemTitle.toLowerCase()
  console.assert(title in pages)
  Cypress.log({name: 'Navigate to'})
  // click the menu item
  cy.findByTitle(RegExp(title, 'i'), unlog)
    .parent(unlog) // select actual SVG element rather than <title> el
    .click(unlog)
  // check that page loads at least some content
  cy.contains(pages[title].lookFor, {log: false, timeout: 4000})
})

Cypress.Commands.add('clickMap', (coord) => {
  console.assert('lat' in coord && 'lon' in coord)
  cy.window()
    .its('LeafletMap')
    .then((map) => {
      let pix = map.latLngToContainerPoint([coord.lat, coord.lon])
      cy.get('div.leaflet-container').click(pix.x, pix.y)
    })
})

Cypress.Commands.add('waitForMapToLoad', () => {
  cy.window()
    .its('LeafletMap')
    .then((map) => {
      // this just does not seem to work as expected. The wait remains necessary
      cy.wrap(map).its('_loaded').should('be.true')
      //cy.wrap(map).its('_renderer').its('_drawing').should('be.false')
      cy.wait(500) // eslint-disable-line cypress/no-unnecessary-waiting
    })
})

Cypress.Commands.add('mapCenteredOn', (latLonArray, tolerance) => {
  cy.window()
    .its('LeafletMap')
    .then((map) => {
      cy.wrap(map.distance(map.getCenter(), latLonArray)).should(
        'be.lessThan',
        tolerance
      )
    })
})

Cypress.Commands.add('centerMapOn', (latLonArray, zoom = 12) => {
  // centers map on a given lat/lon coordinate: [x,y]
  cy.window()
    .its('LeafletMap')
    .then((map) => {
      map.setView(latLonArray, zoom)
    })
})

Cypress.Commands.add('login', function () {
  cy.getCookie('user').then((user) => {
    const inTenMinutes = Date.now() + 600 * 1000
    const inOneHour = Date.now() + 3600 * 1000

    if (user) {
      const value = JSON.parse(decodeURIComponent(user.value))
      if (value.expiresAt > inTenMinutes) {
        cy.log('valid cookie exists, skip getting a new one')
        return
      }
    }

    cy.log('valid cookie does not exist, logging in ')
    cy.request({
      url: `https://${Cypress.env('authZeroDomain')}/oauth/ro`,
      method: 'POST',
      form: true,
      body: {
        client_id: Cypress.env('authZeroClientId'),
        grant_type: 'password',
        username: Cypress.env('username'),
        password: Cypress.env('password'),
        scope: 'openid email analyst',
        connection: 'Username-Password-Authentication'
      },
      timeout: 30000
    }).then((resp) => {
      cy.setCookie(
        'user',
        encodeURIComponent(
          JSON.stringify({
            accessGroup: Cypress.env('accessGroup'),
            expiresAt: inOneHour,
            email: Cypress.env('username'),
            idToken: resp.body.id_token
          })
        ),
        {
          expiry: inOneHour
        }
      )
    })
  })
})
