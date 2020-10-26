/// <reference types="cypress" />
/// <reference types="leaflet" />

declare namespace Cypress {
  // Entity names must be camel cased. They are used to reference JSON keys
  export type Entity =
    | 'analysis'
    | 'bundle'
    | 'opportunities'
    | 'project'
    | 'region'
    | 'regionalAnalysis'
  export type NavToOption =
    | 'analyze'
    | 'edit modifications'
    | 'network bundles'
    | 'opportunity datasets'
    | 'projects'
    | 'regions'
    | 'regional analyses'
    | 'region settings'

  // eslint-disable-next-line
  interface Chainable {
    /**
     * Center the map on the given coordinates.
     * @example cy.centerMapOn([60, 25])
     */
    centerMapOn(coord: [number, number], zoom?: number): Chainable<L.Map>

    /**
     * Set custom analysis value.
     * @example cy.editPrimaryAnalysisJSON('fromLat', 51)
     */
    editPrimaryAnalysisJSON(key: string, newValue: any): Chainable<void>

    /**
     * While in the analysis page, fetch and wait for results.
     * @example cy.fetchResults()
     */
    fetchResults(): Chainable<void>

    /**
     * Get the LeafletMap.
     * @example cy.getLeafletMap().then(map => {...})
     */
    getLeafletMap(): Chainable<L.Map>

    /**
     * Get the pseudo fixture contents.
     * @example cy.getLocalFixture().then((fixture) => { ... })
     */
    getLocalFixture(): Chainable<Record<string, unknown>>

    /**
     * Go directly to the locally stored entity.
     * @example cy.goToEntity('project)
     */
    goToEntity(entity: Entity): Chainable<void>

    /**
     * Check if the values are within a tolerance of each other
     * @example cy.get('#input').itsNumericValue().isWithin(7, 1)
     */
    isWithin(comparison: number, tolerance?: number): Chainable<boolean>

    /**
     * Get the numeric value of an input.
     * @example cy.get('#input').itsNumericValue().should('be', 12)
     */
    itsNumericValue(): Chainable<number>

    /**
     * Get the text as a numberic value.
     * @example cy.findByText('Opportunities).itsNumericText().should('be', 18200)
     */
    itsNumericText(): Chainable<number>

    /**
     * Wait until the spinner is gone and loading is complete.
     */
    loadingComplete(): Chainable<boolean>

    /**
     * Check if the map is centered on a set of coordinates.
     * @example cy.mapCenteredOn([50.5, 121.2], 5)
     */
    mapCenteredOn(lonlat: number[], tolerance: number): Chainable<boolean>

    /**
     * Navigate to a page via the sidebar.
     * @example cy.navTo('projects')
     */
    navTo(location: NavToOption): Chainable<boolean>

    /**
     * Wait until a manual navigation is complete.
     * @example cy.navComplete()
     */
    navComplete(): Chainable<boolean>

    /**
     * Select the default dataset.
     */
    selectDefaultOpportunityDataset(): Chainable<void>

    /**
     * Set the analysis origin.
     * @example cy.setOrigin([lat, lng])
     */
    setOrigin(location: [number, number]): Chainable<void>

    /**
     * Set the time cutoff.
     * @example cy.setTimeCutoff(120)
     */
    setTimeCutoff(cutoff: number): Chainable<void>

    /**
     * Setup Analysis page
     */
    setupAnalysis(): Chainable<void>

    /**
     * Setup an entity and all of it's dependencies.
     * @example cy.setup('bundle')
     */
    setup(entity: Entity): Chainable<void>
    _setup(entity: Entity): Chainable<void>

    /**
     * Store a value in the locally created fixture file.
     */
    storeInLocalFixture(
      key: string,
      value: any
    ): Chainable<Record<string, unknown>>

    /**
     * Wait for the map to be ready for interactivity
     * @example cy.waitForMapToLoad()
     */
    waitForMapToLoad(): Chainable<void>
  }
}