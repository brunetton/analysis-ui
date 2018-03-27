// @flow
import Icon from '@conveyal/woonerf/components/icon'
import message from '@conveyal/woonerf/message'
import memoize from 'lodash/memoize'
import React, {Component} from 'react'

import {Button} from './buttons'
import {DEFAULT_BOUNDS} from '../constants/region'
import ErrorModal from './error-modal'
import InnerDock from './inner-dock'
import {Text, File} from './input'
import Map from './map'
import EditBounds from './map/edit-bounds'
import LabelLayer from './map/label-layer'
import Sidebar from './sidebar'

const cardinalDirections = ['North', 'South', 'East', 'West']

function parseLon (val) {
  const lon = parseFloat(val)
  if (isNaN(lon) || lon < -180 || lon > 180) {
    throw new Error('Invalid longtitude.')
  }
  return lon
}

function parseLat (val) {
  const lat = parseFloat(val)
  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('Invalid latitude.')
  }
  return lat
}

type Props = {
  create: ({region: any, customOpenStreetMapData: ?Object}) => void
}

export default class CreateRegion extends Component {
  props: Props

  state = {
    customOpenStreetMapData: undefined,
    error: undefined,
    region: {
      bounds: DEFAULT_BOUNDS
    }
  }

  onChangeDescription = (e: Event & {target: HTMLInputElement}) =>
    this.onChange({description: e.target.value})
  onChangeName = (e: Event & {target: HTMLInputElement}) =>
    this.onChange({name: e.target.value})

  onChange (updatedFields: {[any]: any}) {
    // set it locally so that state is shared with bounds editor
    this.setState({region: {...this.state.region, ...updatedFields}})
  }

  _changeCustomOsm = (e: Event & {target: HTMLInputElement}) => {
    this.setState({customOpenStreetMapData: e.target.files[0]})
  }

  _create = () => {
    // Create/save will redirect to the region status page
    this.props.create(this.state)
  }

  _setBoundsFor = memoize((direction: string) => (e: Event & {target: HTMLInputElement}) => {
    const {bounds} = this.state.region
    let value = e.target.value
    try {
      value = direction === 'north' || direction === 'south'
        ? parseLat(value)
        : parseLon(value)
    } catch (e) {
      this.setState({
        error: e.message
      })
    }

    this.onChange({bounds: {
      ...bounds,
      [direction]: value
    }})
  })

  _readyToCreate () {
    const {bounds, name} = this.state.region
    try {
      parseLat(bounds.north)
      parseLat(bounds.south)
      parseLon(bounds.east)
      parseLon(bounds.west)
      return name && name.length > 0
    } catch (e) {
      return false
    }
  }

  render () {
    const {region} = this.state
    const readyToCreate = this._readyToCreate()
    const {bounds} = region
    return (
      <div>
        <Sidebar />
        <ErrorModal />

        <div className='Fullscreen'>
          <Map>
            <LabelLayer />
            <EditBounds
              bounds={bounds}
              save={bounds => this.onChange({bounds})}
            />
          </Map>
        </div>

        <div className='ApplicationDock'>
          <div className='ApplicationDockTitle'>
            <Icon type='map-o' /> {message('region.createAction')}
          </div>
          <InnerDock>
            <div className='block'>
              <Text
                label={message('region.name') + '*'}
                name={message('region.name')}
                onChange={this.onChangeName}
                value={region.name}
              />
              <Text
                label={message('region.description')}
                name={message('region.description')}
                onChange={this.onChangeDescription}
                value={region.description}
              />
              <h5>{message('region.osmBounds')}</h5>
              {cardinalDirections.map(direction => (
                <Text
                  key={`bound-${direction}`}
                  label={`${direction} bound`}
                  name={`${direction} bound`}
                  onChange={this._setBoundsFor(direction.toLowerCase())}
                  value={region.bounds[direction.toLowerCase()]}
                />
              ))}

              <File
                label={message('region.customOpenStreetMapData')}
                name='customOpenStreetMapData'
                onChange={this._changeCustomOsm}
              />

              <Button
                block
                disabled={!readyToCreate}
                onClick={this._create}
                name={message('region.createAction')}
                style='success'
              >
                {message('region.createAction')}
              </Button>
            </div>
          </InnerDock>
        </div>
      </div>
    )
  }
}