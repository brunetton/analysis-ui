/* eslint-disable cypress/no-unnecessary-waiting */

describe('Analysis', () => {
  before(() => {
    cy.setup('project')
    cy.setup('opportunities')
  })

  beforeEach(() => {
    cy.setupAnalysis()
    cy.fixture('regions/scratch').as('region')
    cy.fixture('regions/scratch-results').as('results')
    cy.get('div#PrimaryAnalysisSettings').as('primary')
    cy.get('div#ComparisonAnalysisSettings').as('comparison')
  })

  it('has all form elements', function () {
    // note that elements touched in beforeEach are neglected here
    cy.findByRole('slider', {name: 'Time cutoff'})
    cy.findByRole('slider', {name: /Travel time percentile/i})
    cy.get('@primary')
      .findByRole('button', {
        name: 'Fetch results with the current settings to enable button'
      })
      .should('be.disabled')
    cy.get('@primary').contains('scratch project')
    cy.get('@primary').contains('Baseline')

    cy.get('@primary').findByRole('button', {name: /Walk access/i})
    cy.get('@primary').findByRole('button', {name: /Bus/i})
    cy.get('@primary').findByRole('button', {name: /Walk egress/i})

    cy.findByLabelText(/Walk speed/i)
    cy.findByLabelText(/Max walk time/i)
    cy.get('@primary').findByLabelText(/Date/i)
    cy.findByLabelText(/From time/i)
    cy.findByLabelText(/To time/i)
    cy.get('@primary').findByLabelText(/Simulated Schedules/i)
    cy.get('@primary').findByLabelText(/Maximum transfers/i)
    cy.get('@primary').findByLabelText(/Decay function/i)
    cy.findByLabelText(/Routing engine/i)
    cy.get('@primary').findAllByLabelText(/Bounds of analysis/i)
    cy.get('@primary').findByRole('tab', {name: /Custom JSON editor/i})
    cy.findByText(/Fetch results/i).should('be.enabled')
  })

  it('runs, giving reasonable results', function () {
    // tests basic single point analysis at specified locations
    cy.fetchResults() // initialize request
    cy.selectDefaultOpportunityDataset()
    // set new parameters
    cy.setTimeCutoff(75)
    // move marker and align map for snapshot
    const locations: Record<string, [number, number]> = this.region.locations
    for (const key in locations) {
      const location = locations[key]
      cy.setOrigin(location)
      cy.centerMapOn(location)
      cy.fetchResults()
      cy.findByLabelText('Opportunities within isochrone')
        .itsNumericText()
        .isWithin(this.results.locations[key].default, 10)
    }
  })

  it('handles direct access by walk/bike only', function () {
    const location = this.region.locations.middle
    const results = this.results.locations.middle
    cy.setOrigin(location)
    cy.centerMapOn(location)
    // turn off all transit
    cy.get('@primary')
      .findByRole('button', {name: /All transit/i})
      .click()
    // it has changed names, becoming:
    cy.get('@primary')
      .findByRole('button', {name: /bike direct mode/i})
      .click()
    cy.get('@primary')
      .findAllByRole('button', {name: /bike egress/i})
      .should('be.disabled')
    cy.selectDefaultOpportunityDataset()
    cy.fetchResults()

    cy.findByLabelText('Opportunities within isochrone')
      .itsNumericText()
      .isWithin(results.bikeOnly)

    cy.get('svg#results-chart')
      .scrollIntoView()
      .matchImageSnapshot('direct-bike-access-chart')
  })

  it('uses custom analysis bounds', function () {
    const location = this.region.locations.center
    const results = this.results.locations.center
    cy.setOrigin(location)
    cy.centerMapOn(location)
    cy.editPrimaryAnalysisJSON('bounds', this.region.customRegionSubset)
    cy.fetchResults()
    cy.selectDefaultOpportunityDataset()
    cy.findByLabelText('Opportunities within isochrone')
      .itsNumericText()
      .isWithin(results.customBounds)
  })

  it('gives different results at different times', function () {
    const location = this.region.locations.center
    const results = this.results.locations.center
    cy.setOrigin(location)
    cy.centerMapOn(location)
    // set time window in morning rush -- should have high access
    cy.findByLabelText(/From time/i)
      .as('from')
      .clear()
      .type('06:00')
    cy.findByLabelText(/To time/i)
      .as('to')
      .clear()
      .type('08:00')
    cy.fetchResults()
    cy.selectDefaultOpportunityDataset()
    cy.findByLabelText('Opportunities within isochrone')
      .as('results')
      .itsNumericText()
      .isWithin(results['6:00-8:00'], 10)
    // set time window in late evening - lower access
    cy.get('@from').clear().type('20:00')
    cy.get('@to').clear().type('22:00')
    cy.fetchResults()
    cy.get('@results').itsNumericText().isWithin(results['20:00-22:00'], 10)
    // narrow window to one minute - no variability
    cy.get('@from').clear().type('12:00')
    cy.get('@to').clear().type('12:01')
    cy.fetchResults()
    cy.get('svg#results-chart')
      .scrollIntoView()
      .matchImageSnapshot('chart-no-variation')
  })

  it('charts accessibility', function () {
    const location = this.region.locations.center
    cy.setOrigin(location)
    cy.fetchResults()
    cy.selectDefaultOpportunityDataset()
    cy.get('svg#results-chart')
      .as('chart')
      .scrollIntoView()
      .matchImageSnapshot('single-scenario-chart')
    // add a comparison case to the chart
    cy.get('@comparison')
      .findByLabelText(/^Project$/)
      .click({force: true})
      .type('scratch{enter}')
    cy.get('@comparison')
      .findByLabelText(/^Scenario$/)
      .click({force: true})
      .type('baseline{enter}')
    // change the mode
    cy.get('@comparison')
      .findByLabelText(/Identical request settings/i)
      .uncheck({force: true})
    cy.get('@comparison')
      .findByRole('button', {name: /bike access mode/i})
      .click()
    cy.fetchResults()
    cy.get('@chart')
      .scrollIntoView()
      .matchImageSnapshot('chart-with-comparison')
  })

  it('handles decay functions', function () {
    // Should be disabled for < v6
    cy.get('@primary')
      .findByLabelText(/Routing engine/)
      .click({force: true})
      .type('v5.10.0{enter}')

    cy.get('@primary')
      .findByLabelText(/Decay Function/i)
      .should('be.disabled')

    cy.fetchResults()
    cy.findByText(/Select an opportunity dataset to see accessibility/)

    // Should be enabled for >= v6
    cy.get('@primary')
      .findByLabelText(/Routing engine/)
      .click({force: true})
      .type('v6.0.0{enter}')

    cy.get('@primary')
      .findByLabelText(/Decay Function/i)
      .should('be.enabled')
      .select('logistic')

    cy.fetchResults()
    cy.findByText(/Select an opportunity dataset to see accessibility/)
    cy.selectDefaultOpportunityDataset()

    // Logistic function should cause "out of sync" after dataset selected
    cy.findByText(/Results are out of sync with settings/)
    cy.fetchResults()
    cy.findByText(/Analyze results/)
  })

  describe('presets', () => {
    it('CRUD a preset', function () {
      const name = Cypress.env('dataPrefix') + 'preset'
      // Preset select does not exist without first creating a preset
      cy.get('@primary').findByRole('button', {name: /Save/}).click()
      cy.findByLabelText(/Name/).type(name)
      cy.findByRole('button', {name: /Create preset/}).click()
      cy.findByRole('dialog').should('not.exist')
      cy.findByText(/Created new preset/)

      // Preset selector should now exist
      cy.get('@primary')
        .findByLabelText(/Active preset/)
        .click({force: true})
        .type(`${name}{enter}`)

      // Edit the preset name
      cy.get('@primary')
        .findByRole('button', {name: /Edit preset name/})
        .click()
      cy.findByRole('dialog').should('exist')
      cy.findByLabelText(/Name/).dblclick().type('edited name')
      cy.findByRole('button', {name: /Save/}).click()
      cy.findByRole('dialog').should('not.exist')
      cy.findByText(/Saved changes to preset/)

      // Delete the preset
      cy.get('@primary')
        .findByRole('button', {name: /Delete selected preset/})
        .click()
      cy.findByRole('button', {name: /Confirm: Delete preset/}).click()
      cy.findByRole('dialog').should('not.exist')
      cy.findByText(/Deleted selected preset/)
    })
  })
})