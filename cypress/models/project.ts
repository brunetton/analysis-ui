import Bundle from './bundle'
import Model from './model'
import Modification from './modification'

const typeUsesFeed = new Set([
  'Adjust Dwell Time',
  'Adjust Speed',
  'Convert To Frequency',
  'Remove Stops',
  'Remove Trips',
  'Reroute'
])

type ModificationProps = {
  data?: Record<string, unknown>
  onCreate?: () => void
  name?: string
  type: Cypress.ModificationType
}

export default class Project extends Model {
  bundle: Bundle
  modificationNames: Set<string> = new Set()

  constructor(name: string, bundle: Bundle) {
    super(name)
    this.bundle = bundle
  }

  delete() {}

  deleteModification(modificationName: string) {
    this.navTo()
    // Create if it does not exist
    cy.findAllByRole('button').then((buttons) => {
      const pb = buttons.filter((_, el) => el.textContent === modificationName)
      if (pb.length !== 0) {
        cy.wrap(pb.first()).click()
        cy.findByRole('button', {name: /Delete modification/}).click()
        cy.findByRole('button', {name: /Confirm: Delete modification/}).click()
        cy.navComplete()
      }
    })
  }

  findOrCreateModification({
    data,
    name,
    onCreate,
    type
  }: ModificationProps): Modification {
    name ??= type + this.modificationNames.size
    if (this.modificationNames.has(name)) {
      throw new Error('Modification name must be unique per project')
    } else {
      this.modificationNames.add(name)
    }
    const modification = new Modification(name)

    before(() => {
      this.navTo()
      // Create if it does not exist
      cy.findAllByRole('button').then((buttons) => {
        const pb = buttons.filter(
          (_, el) => el.textContent === modification.name
        )
        if (pb.length === 0) {
          cy.createModification(type, modification.name)

          // Set the feed and route to the default
          if (typeUsesFeed.has(type)) {
            cy.selectDefaultFeedAndRoute()
          }

          if (onCreate) onCreate()
        } else {
          cy.wrap(pb.first()).click()
          cy.navComplete()
        }

        // On each test run ensure it starts with the same data.
        if (data) {
          cy.editModificationJSON(data)
        }

        // Store the modification path
        cy.location('pathname').then((path) => {
          modification.path = path
        })
      })
    })

    return modification
  }

  // Helper for setting up a scenarios in this project.
  findOrCreateScenarios(scenarios: string[]) {
    before(() => {
      this.navTo()
      cy.findByRole('tab', {name: 'Scenarios'}).click()
      scenarios.forEach((scenarioName) => {
        cy.get('#scenarios').then((el) => {
          // create named scenario if it doesn't already exist
          if (!el.text().includes(scenarioName)) {
            cy.findByRole('button', {name: 'Create a scenario'}).click()
            cy.wait(10) // eslint-disable-line
            // TODO there has GOT to be a better way...
            cy.get('#scenarios').findAllByRole('group').last().click()

            cy.focused()
              .clear()
              .type(scenarioName + '{enter}')
          }
        })
      })
    })
  }

  navTo() {
    cy.location('pathname').then((path) => {
      if (path === this.path) {
        cy.findByRole('tab', {name: /Modifications/}).click()
      } else {
        cy.visit(this.path)
        cy.navComplete()
      }
    })
  }
}