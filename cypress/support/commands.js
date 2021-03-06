import '@testing-library/cypress/add-commands'
import 'cypress-file-upload'
import {addMatchImageSnapshotCommand} from 'cypress-image-snapshot/command'

addMatchImageSnapshotCommand({
  failureThresholdType: 'percent',
  failureThreshold: 0.05 // allow up to a 5% image diff
})

// Persist the user cookie across sessions
Cypress.Cookies.defaults({
  preserve: ['a0:state', 'a0:session', 'a0:redirectTo', 'adminTempAccessGroup']
})

const prefix = Cypress.env('dataPrefix')
const regionName = Cypress.env('region')
const regionFixture = `regions/${regionName}.json`
// used to store object UUIDs between tests to avoid needless ui interaction
export const pseudoFixture = `cypress/fixtures/regions/.${regionName}.json`
const unlog = {log: false}

// No spinner
Cypress.Commands.add('loadingComplete', () =>
  cy.waitUntil(() => Cypress.$('#sidebar-spinner').length === 0, {
    timeout: 15000
  })
)

// Wait until the page has finished loading
Cypress.Commands.add('navComplete', () => {
  return cy.waitUntil(() => Cypress.$('#sidebar-spinner').length === 0, {
    timeout: 15000
  })
})

// For easy use inside tests
Cypress.Commands.add('getRegionFixture', () => cy.fixture(regionFixture))
Cypress.Commands.add('getPseudoFixture', () => {
  cy.task('touch', pseudoFixture)
  return cy.readFile(pseudoFixture)
})

// Check if a floating point number is within a certain tolerance
Cypress.Commands.add('isWithin', (f1, f2, tolerance = 0) => {
  cy.wrap(Math.abs(Number(f1) - Number(f2)) <= tolerance).should('be.true')
})

// Recursive setup
Cypress.Commands.add('setup', setup)

function setup(entity) {
  const idKey = entity + 'Id'
  return cy.getPseudoFixture().then((storedVals) => {
    if (idKey in storedVals) {
      // thing exists; navigate to it
      switch (entity) {
        case 'region':
          cy.visit(`/regions/${storedVals.regionId}`)
          return cy.navComplete()
        case 'bundle':
          cy.visit(
            `/regions/${storedVals.regionId}/bundles/${storedVals.bundleId}`
          )
          return cy.navComplete()
        case 'opportunities':
          cy.visit(`/regions/${storedVals.regionId}/opportunities`)
          return cy.navComplete()
        case 'project':
          cy.visit(
            `/regions/${storedVals.regionId}/projects/${storedVals.projectId}/modifications`
          )
          return cy.navComplete()
        case 'analysis':
          cy.visit(`/regions/${storedVals.regionId}/regional`, {
            qs: {
              analysisId: storedVals.analysisId
            }
          })
          return cy.navComplete()
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
  // TODO this function is left here empty for now - only one regional analysis
  // is ever created, so it seems best not to duplicate that code here without
  // need. It probably should be done eventually though.
  return assert(false).is.true
}

function createNewOpportunities() {
  return cy.fixture(regionFixture).then((region) => {
    let opportunity = region.opportunities.grid
    let oppName = `${prefix}default_opportunities`
    cy.navTo('Opportunity Datasets')
    cy.findByText(/Upload a new dataset/i).click()
    cy.findByLabelText(/Opportunity dataset name/i).type(oppName)
    cy.findByLabelText(/Select opportunity dataset/).attachFile({
      filePath: opportunity.file,
      encoding: 'base64'
    })
    cy.findByRole('button', {name: /Upload a new opportunity dataset/}).click()
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
  cy.findByLabelText(/Region Name/).type(prefix + regionName, {delay: 0})
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
  cy.findByRole('button', {name: /Creating region/}).should('not.exist')
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
  cy.findByLabelText(/Associated network bundle/i)
    .click({force: true})
    .type(bundleName + '{enter}')
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

/**
 * Guidance taken from https://www.cypress.io/blog/2020/08/17/when-can-the-test-navigate/
 */
Cypress.Commands.add('navTo', (menuItemTitle) => {
  const title = menuItemTitle.toLowerCase()
  // Ensure that any previous navigation is complete before attempting to navigate again
  cy.navComplete()
  // Navigate to a page using one of the main (leftmost) menu items
  // and wait until at least part of the page is loaded.
  const pages = {
    regions: {
      lookFor: /Set up a new region/i,
      path: /\//
    },
    'region settings': {
      lookFor: /Delete this region/i,
      path: /\/regions\/[a-z0-9]+\/edit/
    },
    projects: {
      lookFor: /Create new Project|Upload a .* Bundle/i,
      path: /\/regions\/[a-z0-9]+/
    },
    'network bundles': {
      lookFor: /Create a new network bundle/i,
      path: /\/regions\/[a-z0-9]+\/bundles/
    },
    'opportunity datasets': {
      lookFor: /Upload a new dataset/i,
      path: /\/regions\/[a-z0-9]+\/opportunities*/
    },
    'edit modifications': {
      lookFor: /create a modification/i,
      path: /\/regions\/[a-z0-9]+\/projects*/
    },
    analyze: {
      lookFor: /Comparison Project/i,
      path: /\/regions\/[a-z0-9]+\/analysis*/
    },
    'regional analyses': {
      lookFor: /Regional Analyses/i,
      path: /\/regions\/[a-z0-9]+\/regional*/
    }
  }
  const page = pages[title]
  console.assert(page != null)

  Cypress.log({name: 'Navigate to'})
  // click the menu item
  cy.get('#sidebar')
    .findByRole('button', {name: RegExp(title, 'i')})
    .click()
  // Ensure the pathname has updated to the correct path
  cy.location('pathname').should('match', page.path)
  // check that page loads at least some content
  cy.contains(page.lookFor, {timeout: 8000}).should('be.visible')
  // Ensure the spinner has stopped loading before continuing
  cy.navComplete()
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
  cy.getCookie('a0:state').then((cookie) => {
    // If the cookie already exists, skip the login
    if (cookie) return

    cy.visit('/')
    cy.findByLabelText('Email').type(Cypress.env('username'))
    cy.findByLabelText('Password').type(Cypress.env('password'))
    cy.findByRole('button', {label: 'Log In'}).click()

    // Should show the home page
    cy.findByText(new RegExp(Cypress.env('username')))
  })
})
