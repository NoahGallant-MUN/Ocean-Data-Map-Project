import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import IceDatasetSelector from "./IceDatasetSelector.jsx";
import { Panel, Button, Row, Col, Tabs, Tab } from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import DisplayType from "./DisplayType.jsx";
import ol from "openlayers";
import ReactSimpleRange from "react-simple-range";
import IceComboBox from "./IceComboBox.jsx";
import { Checkbox } from 'react-bootstrap'

const i18n = require("../i18n.js");

export default class Layer extends React.Component {
  constructor(props) {
    super(props);
    this._mounted = false;
    this.state = {
      layer: undefined,
      layerState: 'Add Layer',
      useGlobalTime: true,
      timeSource: 'global',
      // DATA INFO
      variables: {},
      datasets: {},
      depths: {},
      default_scales: "0,1",

      // DISPLAY INFO
      colourmaps_val: [],
      opacity: 50,

      // CURRENT STATE
      current_depth: 0,
      current_quantum: '',
      current_colourmap: ['default'],
      current_display: 'contours',
      current_variable: undefined,
      current_dataset: undefined,
      current_scale: '-5,30',
      current_map: 'left',

      compare: false,
    };

    this.changeDataset()
    this.range = undefined

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
    this.createIce = this.createIce.bind(this);
    this.toggleLayer = this.toggleLayer.bind(this);
    this.localUpdate = this.localUpdate.bind(this);
    this.updateIce = this.updateIce.bind(this);
    this.sendData = this.sendData.bind(this);

    //Getting metadata
    //this.getVariables = this.getVariables.bind(this);
    //this.getDatasets = this.getDatasets.bind(this);
    this.updateTransparency = this.updateTransparency.bind(this);
    //this.getDataInfo = this.getDataInfo.bind(this);
    //this.addData = this.addData.bind(this);
    this.removeData = this.removeData.bind(this);
    this.changeDataset = this.changeDataset.bind(this)
    this.changeVariable = this.changeVariable.bind(this);
    this.changeDepth = this.changeDepth.bind(this);
    this.changeTimeSource = this.changeTimeSource.bind(this);

    //this.setCurrent = this.setCurrent.bind(this);
    this.dateToISO = this.dateToISO.bind(this);
    //this.fetchVariables = this.fetchVariables.bind(this);
    this.toggleCompare = this.toggleCompare.bind(this);
  }

  componentDidMount() {
    this._mounted = true
    this.createIce();
  }

  /*
  setCurrent() {
    let dataset = ''
    let quantum
    if (this.props.defaultDataset != undefined) {
      for (dataset in this.state.datasets) {
        if (this.state.datasets[dataset] === this.props.defaultDataset) {
          quantum = this.state.datasets[dataset]['quantum']
        }
      }
      dataset = this.props.defaultDataset
    } else {
      dataset = this.state.datasets[0]['id']
      quantum = this.state.datasets[0]['quantum']
    }

    let variable = ''
    if (this.props.defaultVariable != undefined) {
      variable = this.props.defaultVariable

    } else {
      variable = this.state.variables[0]['id']
    }


    let depth = 0
    this.setState({
      current_dataset: dataset,
      current_variable: variable,
      current_scale: this.state.variables[0]['scale'],
      current_depth: depth,
      current_quantum: quantum,
    })
  }
  */

  /*
    Sends the data information back to OceanNavigator.jsx to be used by the modals

  */
  sendData(update) {
    let data
    if (this.state.current_map in this.props.state.data) {
      data = jQuery.extend({}, this.props.state.data[this.state.current_map])
    } else {
      data = {}
    }
    let time_access = this.props.layerType + this.state.current_dataset + (parseInt(this.props.index) + 1)
  
    if (this.state.current_dataset !== undefined && this.state.current_variable !== undefined) {
      console.warn("DATASET AND VARIABLE EXIST")
      if (this.props.layerType in data) {
        if (this.props.value in data[this.props.layerType]) {
          if (this.state.current_dataset in data[this.props.layerType][this.props.value]) {
            console.warn("INCLUDES DATASET")
            if (this.state.current_variable in data[this.props.layerType][this.props.value][this.state.current_dataset] && update === undefined) {
              console.warn("INCLUDES VARIABLE")
              let frequency = data[this.props.layerType][this.props.value][this.state.current_dataset][this.state.current_variable].frequency
              data[this.props.layerType][this.props.value][this.state.current_dataset][this.state.current_variable].frequency = frequency + 1
            } else {
              console.warn("DOESN'T INCLUDE VARIABLE")
              data[this.props.layerType][this.props.value][this.state.current_dataset][this.state.current_variable] = {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: this.props.state.timestamps[time_access],
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth,
              }
            }
          } else {
            console.warn("DOESN'T INCLUDE DATASET")
            data[this.props.layerType][this.props.value][this.state.current_dataset] = {
              [this.state.current_variable]: {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: this.props.state.timestamps[time_access],
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth,
              }
            }
          }
  
        } else {
          console.warn("DATASET AND VARIABLE DON'T EXIST")
          data[this.props.layerType][this.props.value] = {
            [this.state.current_dataset]: {
              [this.state.current_variable]: {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: this.props.state.timestamps[time_access],
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth
              }
            }
          }
        }    
      } else {
        data[this.props.layerType] = {
          [this.props.value]: {
            [this.state.current_dataset]: {
              [this.state.current_variable]: {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: this.props.state.timestamps[time_access],
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth
              }
            }
          }
        }
      }
    }
    let new_data = jQuery.extend({}, this.props.state.data)
    new_data[this.state.current_map] = data
    this.props.globalUpdate('data', new_data)
  }

  /*
    This should be the only function called when a dataset change happens
    This includes changes to the available datasets

    If dataset is undefined - initialize
  */
  changeDataset(dataset) {
    console.warn("CHANGING DATASET: ", dataset);
    let variable_promise = undefined;
    let old_dataset = this.state.current_dataset;
    let old_variable = this.state.current_variable;

    

    let quantum;
    // Load datasets if they arent already
    if (dataset === undefined) {
      const dataset_promise = $.ajax("/api/v1.0/datasets/?envType=" + this.props.layerType).promise();
      $.when(dataset_promise).done(function (datasets) {
        console.warn("DATASETS: ", datasets)
        dataset = datasets[0]['id']
        quantum = datasets[0]['quantum']
        this.setState({
          datasets: datasets,
          current_dataset: dataset,
          current_quantum: quantum
        })
        variable_promise = $.ajax("/api/v1.0/variables/?dataset=" + dataset + "&envType=" + this.props.layerType).promise();


        // Update Variables
        $.when(variable_promise).done(function (variables) {
          console.warn("Variables: ", variables)
          let variable = variables[0]['id']

          this.setState({
            variables: variables,
            current_variable: variable,
          }, () => {
            this.changeTimeSource(dataset, quantum, variable, old_dataset, old_variable)
            this.sendData()
          })

          $.ajax({
            url: "/api/v1.0/depth/?dataset=" + dataset + "&variable=" + variable,
            success: function (depths) {
              console.warn("DEPTHS: ", depths)
              this.setState({
                depths: depths,
                current_depth: 0,
              })
            }.bind(this),
            error: function () {
              console.warn("FAILED TO LOAD DEPTHS")
            }
          })


        }.bind(this));
      }.bind(this));
    } else {  // Not initializing, available datasets don't change
      // Remove old dataset from globabl data Object
      this.removeData(this.state.current_map, old_dataset, old_variable);
      // Change current_dataset and current_quantum
      // Located Quantum
      let quantum
      for (let d in this.state.datasets) {
        if (this.state.datasets[d]['id'] === dataset) {
          quantum = this.state.datasets[d]['quantum']
          break;
        }
      }
      this.setState({
        current_dataset: dataset,
        current_quantum: quantum,
      })
      // Fetch new Variables
      variable_promise = $.ajax("/api/variables/?dataset=" + dataset + "&envType=" + this.props.layerType).promise();

      // Update Variables
      $.when(variable_promise).done(function (variables) {
        console.warn("Variables: ", variables)
        let variable = variables[0]['id']
        const depths_promise = $.ajax("/api/v1.0/depth/?dataset=" + dataset + "&variable=" + variable).promise();
        console.warn("VARIABLE: ", variable)
        this.setState({
          variables: variables,
          current_variable: variable,
        }, () => {
          this.changeTimeSource(dataset, quantum, variable, old_dataset, old_variable)
          this.sendData()
        })
        console.warn("STATE SET: ", this.state)
        $.when(depths_promise).done(function (depths) {
          console.warn("DEPTHS: ", depths)
          this.setState({
            depths: depths,
            current_depth: 0,
          })
        }.bind(this))
      }.bind(this))


    }
    // 
  }

  changeVariable(variable) {
    console.warn("CHANGING VARIABLE")

    // Change Time Source
    this.changeTimeSource(this.state.current_dataset, this.state.current_quantum, variable, this.state.current_dataset, this.state.current_variable)

    const depths_promise = $.ajax("/api/v1.0/depth/?dataset=" + this.state.current_dataset + '&variable=' + variable)

    console.warn("CALLING REMOVE DATA")
    this.props.removeData(this.state.current_map, this.state.current_dataset, this.state.current_variable)
    
    $.when(depths_promise).done(function (depths) {
      this.setState({
        current_variable: variable,
        depths: depths,
        current_depth: 0,
      });
      this.sendData()
    }.bind(this))
  }

  changeDepth(depth) {
    console.warn("CHANGING DEPTH")
    this.setState({
      current_depth: depth
    })
  }

  /*
    Contains ajax calls to load the data
  */
  /*
  getDataInfo() {

    // DATASETS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    $.ajax({
      url: `/api/v1.0/datasets/?envType=` + this.props.layerType,
      success: function (response) {
        this.setState({
          datasets: response
        })
      }.bind(this),
      error: function () {
        console.error("Dataset Info Failed to Load")
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    }).done(() => {
      this.changeTimeSource(this.state.datasets[0]['id'], this.state.datasets[0]['quantum'], undefined)
      // VARIALBE ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      let var_url = `/api/v1.0/variables/?dataset=` + this.state.datasets[0]['id'] + `&envType=` + this.props.layerType
      $.ajax({
        url: var_url,
        success: function (response) {
          this.setState({
            variables: response
          })
        }.bind(this),
        error: function () {
          console.error("Variables Failed to Load")
        }
      }).done(() => {
        // DEPTH ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        $.ajax({
          url: `/api/v1.0/depth/?dataset=` + this.state.datasets[0]['id'] + '&variable=' + this.state.variables[0]['id'],
          success: function (response) {
            this.setState({
              depths: response
            })
          }.bind(this),
          error: function () {
            console.error("Depth Values Failed to Load")
          }
        }).done(this.setCurrent())
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      })
    })


    // CODE TO RECEIVE ALL DATASETS // THIS IS TO ALLOW VARIABLE FIRST SELECTION
    /*
    $.ajax({
      url: `/api/v1.0/variables/?dataset=all&env_type=` + this.props.layerType,
      success: function(response) {
        console.warn("RESPONSE: ", response)
        this.setState({
          'datainfo': response
        })
        let variables = this.getVariables();
        if (variables == []) {
          throw Error;
        }
        this.setState({
          'variables': variables,
          'current_variable': variables[0],
        })
      
        let datasets = this.getDatasets(this.state.current_variable);
        this.setState({
          'datasets': datasets,
          'current_dataset': datasets[0],
        })
        this._mounted = true;
      }.bind(this),
      error: function() {
        console.error("Error getting data!");
      }
    });
    

}*/

  componentDidUpdate(prevProps, prevState) {
    if (this.state.datasets != [] && this.state.variables != [] && this.props.state.timestamps !== {} && this.props.state.timestamps !== undefined) {
      if (this.props.state.timestamps != prevProps.state.timestamps || this.state.current_dataset != prevState.current_dataset || this.state.current_variable != prevState.current_variable) {
        this.updateIce();
      }//} else if (this.props.state.timestamps != prevProps.state.timestamps && this.props.state.timestamps != undefined) {
      //  this.updateIce();
      //}
    }

  }
  handleTabs(key) {
    this.setState({ currentTab: key, });
  }

  toggleCompare() {


    this.removeData(this.state.current_map, this.state.current_dataset, this.state.current_variable)
    console.warn("TOGGLE COMPARE")
    let current_map;

    this.toggleLayer()

    console.warn("CURRENT MAP: ", this.state.current_map)
    if (this.state.current_map === 'left') {
      current_map = 'right'
    } else {
      current_map = 'left'
    }

    console.warn("CURRENT MAP: ", this.state.current_map)

    this.setState({
      compare: !this.state.compare,
      current_map: current_map
    }, this.sendData)
  }

  getVariables() {
    let variables = []

    for (let key in this.state.datainfo) {
      variables.push(key)
    }

    return variables
  }

  getDatasets(variable) {
    if (variable == undefined) {
      let datasets = this.state.datainfo[variables[0]]['datasets']
      return datasets
    } else {
      let datasets = this.state.datainfo[variable]['datasets']
      return datasets
    }
  }

  // Updates Ice app state
  localUpdate(key, value) {

    /*
    if (key == 'current_variable') {
      let datasets = this.state.datainfo[value]['datasets']
      if (!(this.state.current_dataset in datasets)) {
        this.setState({
          'current_dataset': datasets[0]
        })
      }
      this.setState({
        'current_variable': value,
        'datasets': datasets
      })
    } else if (key == 'current_dataset') {
      this.setState({
        'current_dataset': value,
      })
    } else {
      let newState = this.state
      newState[key] = value
      this.setState(newState, () => {
        console.log("SCALE IN CALLBACK: ", this.state.scale_1);
      })
      
    }
    */

    if (key === 'current_depth') {
      this.changeDepth(value)
    } else if (key === 'current_variable') {
      this.changeVariable(value)
    } else if (key === 'current_dataset') {
      this.changeDataset(value)
    } else {
      console.warn("KEY: ", key)
      console.warn("VALUE: ", value)
      this.setState({
        [key]: value,
      })
      this.updateIce()
    }
    

  }

  removeData(map, dataset, variable) {
    console.warn("REMOVING DATA")
    console.warn("  map: ", map)
    console.warn("  dataset: ", dataset)
    console.warn("  variable: ", variable)
    if (map === undefined || dataset === undefined || variable === undefined) {
      return
    }
    let data = jQuery.extend({}, this.props.state.data)
    console.warn('DATA BEFORE DELETE: ', data)
    delete data[map][this.props.layerType][dataset].variable
    console.warn("DATA AFTER DELETE: ", data)
    if (data[map][this.props.layerType][dataset] === {}) {
      delete data[map][this.props.layerType].dataset
      if (data[map][this.props.layerType] === {}) {
        let type = this.props.layerType
        delete data[map].type

        if (data[map] === {}) {
          delete data[map]
        }
      }
    }
    this.props.globalUpdate('data', data)
  }

  /*
  fetchVariables(dataset) {
    $.ajax({
      url: `/api/v1.0/variables/?dataset=` + dataset + '&envType=' + this.props.layerType,
      success: function (response) {
        if (response.length < 1) {
          let datasets = this.state.datasets
          delete datasets[dataset]
          this.setState({
            datasets: datasets
          })
          this.setCurrent()
          return
        }
        this.setState({
          variables: response,
          current_variable: response[0]['id']
        })
      }.bind(this),
      error: function () {
        console.error("Failed to Load Variable")
      }
    }).done(() => {
      this.fetchDepths(dataset, this.state.variables[0]['id'])
    })
  }

  fetchDepths(dataset, variable) {
    $.ajax({
      url: `/api/v1.0/depth/?dataset=` + dataset + `&variable=` + variable,
      success: function (response) {
        console.warn("RESPONSE: ", response)
        this.setState({
          current_depth: 0,
          depths: response
        })
      }.bind(this),
      error: function () {
        console.error("Depth Values Failed to Load")
      }
    })
  }
*/
  createIce() {

    let layer_ice = new ol.layer.Tile(
      {
        preload: Infinity,
        opacity: this.state.opacity / 100,
        source: new ol.source.XYZ({
          attributions: [
            new ol.Attribution({
              html: "CONCEPTS",
            })
          ],
        }),
      });
    layer_ice.set('name', this.props.layerType)

    this.setState({
      ice_layer: layer_ice
    })

  }

  /*
    Converts a JS Date() Object to ISO8604 extended format

    ** This does not ensure that this date exists in the dataset **

    requires: JS Date() Object
    ensures: Valid ISO8604 extended format string
  */
  dateToISO(date, quantum) {
    if (date === undefined) {
      return
    }
    function formatDay(day) {
      if (day.toString().length === 1) {
        return '0' + day.toString()
      } else {
        return day
      }
    }

    function formatMonth(month) {
      if (month.toString().length === 1) {
        return '0' + month.toString()
      } else {
        return month
      }
    }

    let iso

    if (quantum === 'min') {
      iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-' + formatDay(date.getUTCDate()) + 'T' + date.getUTCHours() + date.getUTCMinutes() + ':00+00:00'
    } else if (quantum === 'hour') { // Only returns ISO to hour precision
      iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-' + formatDay(date.getUTCDate()) + 'T' + date.getUTCHours() + ':00:00+00:00'
    } else if (quantum === 'day') { // Only returns ISO to day precision
      iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-' + formatDay(date.getUTCDate()) + 'T00:00:00+00:00'
    } else if (quantum === 'month') { // Only returns ISO to month precision
      iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-01T00:00:00+00:00'
    } else if (quantum === 'year') {
      iso = date.getUTCFullYear() + '-01-01T00:00:00+00:00'
    } else {    // Returns ISO to max available precision
      iso = date.getUTCFullYear() + '-' + date.getUTCMonth() + '-' + date.getUTCDate() + 'T' + date.getUTCHours() + ':' + date.getUTCMinutes() + ':' + date.getUTCSeconds() + '+00:00'
    }

    return iso
  }

  updateIce() {
    //this.sendData('update')
    let layer_ice = this.state.ice_layer;
    let props = layer_ice.getSource().getProperties();
    let time_access = this.props.layerType + this.state.current_dataset + (parseInt(this.props.index) + 1)
    let timeString = this.dateToISO(this.props.state.timestamps[time_access], this.state.current_quantum)
    let masked = 0
    if (this.props.layerType === 'met') {
      masked = 1
    }
    // Sets new values for tiles
    props.url = `/api/v1.0/tiles` +
      `/${this.props.options.interpType}` +
      `/${this.props.options.interpRadius}` +
      `/${this.props.options.interpNeighbours}` +
      `/${this.props.state.projection}` +
      `/${this.state.current_dataset}` +
      `/${this.state.current_variable}` +
      //`/2018-07-12T00:00:00+00:00` +
      `/${timeString}` +
      `/0` +
      `/${this.state.current_scale}` +
      `/${masked}` +    // 0 Masks the land
      `/${this.state.current_display},${this.state.current_colourmap}` +
      `/{z}/{x}/{y}.png`;

    props.projection = this.props.state.projection;
    props.attributions = [
      new ol.Attribution({
        html: this.state.dataset_attribution,
      }),
    ];
    const newSource = new ol.source.XYZ(props);

    // Gives updated source to layer
    layer_ice.setSource(newSource)

    // Reloads layer to apply changes
    if (this.state.current_map === 'left') {
      this.props.mapComponent.reloadLayer();
    } else {
      this.props.mapComponent2.reloadLayer();
    }

  }


  /*
  toggleLayer()

  This function toggles the ice layer on and off

  */
  toggleLayer() {
    let layers = this.props.layers

    console.warn("LAYERS: ", layers)
    if (layers.includes(this.state.ice_layer)) {

      let new_layers = layers;
      let ice_layer = this.state.ice_layer;
      this.setState({
        layerState: 'Add Ice'
      })

      new_layers.splice(new_layers.indexOf(ice_layer), 1);

      this.props.globalUpdate('layers', new_layers)
      if (this.state.current_map === 'left') {
        this.props.mapComponent.toggleLayer(ice_layer, 'remove')
      } else {
        this.props.mapComponent2.toggleLayer(ice_layer, 'remove')
      }
    } else {
      this.updateIce()

      this.setState({
        layerState: 'Remove Ice'
      })

      let new_layers = this.props.layers

      new_layers.push(
        this.state.ice_layer
      )

      this.props.globalUpdate('layers', new_layers)
      if (this.state.current_map === 'left') {
        this.props.mapComponent.toggleLayer(this.state.ice_layer, 'add')
      } else {
        this.props.mapComponent2.toggleLayer(this.state.ice_layer, 'add')
      }
    }
  }

  updateTransparency(e) {
    this.setState({
      opacity: e.value
    })
    this.state.ice_layer.setOpacity(e.value / 100)
  }

  changeTimeSource(new_dataset, new_quantum, new_variable, old_dataset, old_variable) {
    console.warn("CHANGING TIME SOURCE");
    console.warn("NEW DATASET: ", new_dataset);
    console.warn("NEW QUANTUM: ", new_quantum);
    console.warn("NEW VARIABLE: ", new_variable)
    console.warn("OLD DATASET: ", old_dataset);
    //if (dataset === undefined) {
    //  dataset = this.state.current_dataset
    //}

    let new_timeSources = jQuery.extend({}, this.props.state.timeSources)
    if (new_timeSources[this.state.current_map] === undefined) {
      new_timeSources[this.state.current_map] = {}
    }
    if (old_dataset === undefined) { // If currently using global time
      console.warn("NO PREVIOUS DATASET")
      if (this.props.layerType in new_timeSources[this.state.current_map]) {
        if (new_dataset in new_timeSources[this.state.current_map][this.props.layerType]) {
          new_timeSources[this.state.current_map][this.props.layerType][new_dataset]['variables'].push(new_variable)
          //this.setState({
          //  timeBarNum: new_timeSources[this.state.current_map][this.props.layerType][new_dataset].frequency
          //})
        } else {
          new_timeSources[this.state.current_map][this.props.layerType][new_dataset] = {
            variables:[new_variable],
            quantum: new_quantum,
          }
        }
      } else {
        new_timeSources[this.state.current_map][this.props.layerType] = {
          [new_dataset]: {
            variables: [new_variable],
            quantum: new_quantum
          }
        }    // Adds the layerType and dataset
      }


      //this.props.globalUpdate('timeSources', new_timeSources)    // Adds to global time source list

      this.setState({
        useGlobalTime: false,    // Unchecks the using global time selectbox
        timeSource: this.props.layerType    // Indicates the new source to look for in the global time source list
      })
    } else {
      console.warn("MUST REMOVE OLD DATASET")
      // Reduces or Removes instances of datasets
      if (old_dataset in new_timeSources[this.state.current_map][this.props.layerType]) {
        if (new_timeSources[this.state.current_map][this.props.layerType][old_dataset]['variables'].length === 1) {
          console.warn("DELETING PREVIOUS DATASET")
          delete new_timeSources[this.state.current_map][this.props.layerType][old_dataset]
          if (new_timeSources[this.state.current_map][this.props.layerType] === {}) {
            delete new_timeSources[this.state.current_map][this.props.layerType]
          }
        } else {
          console.warn("DECREASING FREQUENCY")
          let idx = new_timeSources[this.state.current_map][this.props.layerType][old_dataset]['variables'].indexOf(old_variable)
          new_timeSources[this.state.current_map][this.props.layerType][old_dataset]['variables'].splice(idx, 1)
        }
      }

      // Updates with new dataset
      if (new_dataset !== undefined) {
        if (this.props.layerType in new_timeSources[this.state.current_map]) {
          if (new_dataset in new_timeSources[this.state.current_map][this.props.layerType]) {
            console.warn("SOMETHING")
            console.warn("NEW TIME SOURCES: ", new_timeSources)
            new_timeSources[this.state.current_map][this.props.layerType][new_dataset]['variables'].push(new_variable)
          } else {
            console.warn("ADDING NEW")
            new_timeSources[this.state.current_map][this.props.layerType][new_dataset] = {
              variables: [new_variable],
              quantum: new_quantum
            }
          }
        }
      }

      //for (let idx in new_timeSources[this.state.timeSource]) {
      //if (new_dataset === new_timeSources[this.props.layerType][idx]) {

      //new_timeSources[this.props.layerType].splice(idx, 1)
      //break;
      //}
      //}
    }
    this.props.globalUpdate('timeSources', new_timeSources)
    this.setState({
      useGlobalTime: true,    // Checks the using global time selectbox
      timeSource: 'global'    // Indicates the new source to look for in the global time source list
    })

  }

  render() {

    _("Variable Range");
    _("Show Bathymetry Contours");


    if (Object.keys(this.props.state.timestamps).length > 0 && this.props.state.timestamps !== undefined && this._mounted === true) {

      let time_access = this.props.layerType + this.state.current_dataset + (parseInt(this.props.index) + 1)
      let timeString = this.dateToISO(this.props.state.timestamps[time_access], this.state.current_quantum)

      this.range = <Range
        //key='current_scale'
        id='current_scale'
        state={this.state.current_scale}
        setDefaultScale={this.state.setDefaultScale}
        def=''
        onUpdate={this.localUpdate}
        title={_("Scale")}
        autourl={"/api/v1.0/range/" +
          this.state.current_dataset + "/" +
          this.state.current_variable + "/" +
          this.props.options.interpType + "/" +
          this.props.options.interpRadius + "/" +
          this.props.options.interpNeighbours + "/" +
          this.props.state.projection + "/" +
          this.props.state.extent.join(",") + "/" +
          this.state.current_depth + "/" +
          timeString + ".json"
        }
        default_scale={this.state.current_scale}
      ></Range>
    }


    let depth = []
    if (this.state.depths.length > 0) {
      if (this.props.layerType === 'ocean') {
        depth.push(<IceComboBox
          data={this.state.depths}
          current={this.state.current_depth}
          localUpdate={this.localUpdate}
          key='depth'
          name='current_depth'
          title={_("Depth")}
        ></IceComboBox>)
      } else if (this.props.layerType === 'met') {
        depth.push(<IceComboBox
          data={this.state.depths}
          current={this.state.current_depth}
          localUpdate={this.localUpdate}
          key='depth'
          name='current_depth'
          title={_("Altitude")}
        ></IceComboBox>)
      }
    }

    //Creates Main Map Panel
    let datasets = []
    if (this.state.datasets.length > 1) {
      datasets.push(<IceComboBox
        data={this.state.datasets}
        current={this.state.current_dataset}
        localUpdate={this.localUpdate}
        key='dataset'
        name='current_dataset'
        title={_("Dataset")}
      ></IceComboBox>)
    }

    let variables = <IceComboBox
      data={this.state.variables}
      current={this.state.current_variable}
      localUpdate={this.localUpdate}
      key='variable'
      name='current_variable'
      title={_("Variable")}
    ></IceComboBox>

    const inputs = [
      <Panel
        key='left_map_panel'
        collapsible
        defaultExpanded
        header={this.props.state.dataset_compare ? _("Left Map (Anchor)") : _(this.props.layerName)}
        bsStyle='primary'
      >
        <Button
          className='removeButton'
          onClick={() => this.props.removeLayer(this.state.current_map, this.state.current_dataset, this.state.current_variable, this.props.value)}
        >X</Button>
        <Checkbox
          key='compare'
          id='compare'
          onChange={this.toggleCompare}
          checked={this.state.compare}
        //style={this.props.style}
        >
          Use as Comparison
        </Checkbox>
        {/*
          <SelectBox
          id='useGlobalTime'
          title='Sync to Global Time'
          state={this.state.useGlobalTime}
          onUpdate={this.changeTimeSource}
        ></SelectBox>
        */}
        {datasets}
        {variables}
        {depth}
        {this.range}

        {/* Contour Selector drop down menu */}
        {/*<ContourSelector 
          key='contour' 
          id='contour' 
          state={this.state.contour} 
          def='' 
          onUpdate={this.onLocalUpdate} 
          dataset={this.state.dataset_0.dataset} 
          title={_("Additional Contours")}
        >
          {_("contour_help")}
        </ContourSelector>
        */}

        <IceComboBox
          data={this.props.state.display}
          current={this.state.current_display}
          localUpdate={this.localUpdate}
          key='current_display'
          name='current_display'
          title={_("Display")}
        ></IceComboBox>

        <ComboBox
          id='current_colourmap'
          state={this.state.current_colourmap}
          def={"current_colourmap"}
          onUpdate={this.localUpdate}
          url='/api/v1.0/colormaps/'
          title={_("Colour Map")}></ComboBox>

        <ReactSimpleRange
          className='iceSlider'
          value={this.state.opacity}
          min={0}
          max={100}
          step={1}
          label={true}
          onChange={this.updateTransparency}
        />

        <Button className='addIceButton' onClick={this.toggleLayer}>
          {this.state.layerState}
        </Button>
      </Panel>
    ];

    // Creates Right Map Panel when comparing datasets
    /*
    if (this.props.state.dataset_compare) {
      inputs.push(
        <Panel
          key='right_map_panel'
          collapsible
          defaultExpanded
          header={_("Right Map")}
          bsStyle='primary'
        >
          {/*
          <IceDatasetSelector 
          id='dataset_1'
          state={this.props.state.dataset_1}
          datainfo={this.state.datainfo}
          onUpdate={this.props.globalUpdate}
          depth={true}
        />
        }
          {}
          <Range
            key='scale'
            id='scale'
            state={this.state.scale_1}
            setDefaultScale={this.state.setDefaultScale}
            def=''
            onUpdate={this.localUpdate}
            title={_("Variable Range")}
            autourl={"/api/v0.1/range/" +
              this.props.options.interpType + "/" +
              this.props.options.interpRadius + "/" +
              this.props.options.interpNeighbours + "/" +
              this.state.current_dataset + "/" +
              this.props.state.projection + "/" +
              this.props.state.extent.join(",") + "/" +
              this.state.depth + "/" +
              this.props.state.time + "/" +
              this.state.datainfo[this.state.current_variable]['info'] + ".json"
            }
            default_scale={this.props.state.dataset_1.variable_scale}
          ></Range>}
          <Button className='addIceButton' onClick={this.toggleLayer}>
            ADD ICE
          </Button>
        </Panel>
      );
}*/

    return (
      <div>
        {inputs  /* Renders Side Panel */}
      </div>
    );
  }
}

//***********************************************************************
Layer.propTypes = {
  key: PropTypes.number,
  value: PropTypes.number,
  state: PropTypes.object,
  removeLayer: PropTypes.func,
  toggleLayer: PropTypes.func,
  reloadLayer: PropTypes.func,
  globalUpdate: PropTypes.func,
  options: PropTypes.object,
  layerType: PropTypes.string,
  swapViews: PropTypes.bool,
  showHelp: PropTypes.bool,
  updateOptions: PropTypes.func,
};