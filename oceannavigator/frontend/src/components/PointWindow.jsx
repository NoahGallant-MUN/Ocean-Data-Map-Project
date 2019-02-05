/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image corresponding to a Selected Point

*/


import React from "react";
import { Button, Nav, NavItem, Panel, Row, Col } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import SelectBox from "./SelectBox.jsx";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import LocationInput from "./LocationInput.jsx";
import Range from "./Range.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import ReactLoading from 'react-loading';
import Spinner from '../images/spinner.gif'

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

const TabEnum = {
  PROFILE: 1,
  CTD: 2,
  TS: 3,
  STICK: 4,
  SOUND: 5,
  OBSERVATION: 6,
  MOORING: 7,
};

export default class PointWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      selected: TabEnum.PROFILE,
      scale: props.scale + ",auto",
      depth: props.depth,
      showmap: true,
      colormap: "default",
      starttime: Math.max(props.time - 24, 0),
      variables: [],
      variable: [props.variable],
      observation_variable: [7],
      size: "10x7",
      dpi: 144,
      plotTitles: Array(7).fill(""),

      xminScale: undefined,
      xmaxScale: undefined,
      yminScale: undefined,
      ymaxScale: undefined,
      title: undefined,
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
    this.updatePlot = this.updatePlot.bind(this);
    this.updateScale = this.updateScale.bind(this);
  }

  componentDidMount() {
    this._mounted = true;

    // If an observation point has been picked, default to the
    // Observation tab.
    if (this.props.point[0][2] !== undefined) {
      this.setState({
        selected: TabEnum.OBSERVATION,
      });
    }

    this.populateVariables(this.props.dataset);

  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentWillReceiveProps(props) {
    if (stringify(this.props) !== stringify(props) && this._mounted) {
      const state = {};

      if (!Array.isArray(this.state.depth)) {
        state.depth = props.depth;
      }
      if (this.state.scale.indexOf("auto") !== -1) {
        state.scale = props.scale + ",auto";
      }
      else {
        state.scale = props.scale;
      }

      this.setState(state);

      // Check if dataset was changed
      if (this.props.dataset !== props.dataset) {
        this.populateVariables(props.dataset);
      }
    }
  }

  populateVariables(dataset) {
    $.ajax({
      url: "/api/variables/?dataset=" + dataset + "&anom",
      dataType: "json",
      cache: true,

      success: function (data) {
        if (this._mounted) {
          const vars = data.map(function (d) {
            return d.id;
          });

          if (vars.indexOf(this.props.variable.split(",")[0]) === -1) {
            this.props.onUpdate("variable", vars[0]);
          }

          this.setState({
            variables: data.map(function (d) {
              return d.id;
            }),
          }, () => {
            this.updatePlot()
          });
        }
        this.updatePlot()
      }.bind(this),

      error: function (xhr, status, err) {
        if (this._mounted) {
          console.error(this.props.url, status, err.toString());
        }
      }.bind(this)
    });
  }

  //Updates Plot with User Specified Title
  updatePlotTitle(title) {
    if (title !== this.state.plotTitles[this.state.selected - 1]) {   //If new plot title
      const newTitles = this.state.plotTitles;
      newTitles[this.state.selected - 1] = title;
      this.setState({ plotTitles: newTitles, });   //Update Plot Title
    }
  }

  onLocalUpdate(key, value) {
    if (this._mounted) {
      let newState = {};

      if (typeof (key) === "string") {
        newState[key] = value;
      }
      else {
        for (let i = 0; i < key.length; i++) {
          newState[key[i]] = value[i];
        }
      }
      this.setState(newState);

      let parentKeys = [];
      let parentValues = [];

      if (newState.hasOwnProperty("depth") && newState.depth != "all") {
        if (!Array.isArray(newState.depth)) {
          parentKeys.push("depth");
          parentValues.push(newState.depth);
        } else if (newState.depth.length > 1) {
          parentKeys.push("depth");
          parentValues.push(newState.depth[0]);
        }
      }

      if (newState.hasOwnProperty("point")) {
        parentKeys.push("point");
        parentValues.push(newState.point);

        parentKeys.push("names");
        parentValues.push([]);
      }

      if (newState.hasOwnProperty("variable_scale") &&
        this.state.variable.length === 1) {
        parentKeys.push("variable_scale");
        parentValues.push(newState.variable_scale);
      }

      if (newState.hasOwnProperty("variable") && newState.variable.length == 1) {
        parentKeys.push("variable");
        parentValues.push(newState.variable[0]);
      }

      if (parentKeys.length > 0) {
        this.props.onUpdate(parentKeys, parentValues);
      }
    }
  }

  // Handles when a tab is selected
  onSelect(key) {
    console.warn("ON SELECT: ", key)
    this.setState({
      selected: key
    }, () => { this.updatePlot() });
  }

  updateScale(e) {
    let value = e.target.value
    let key = e.target.id
    console.warn("UPDATING SCALE")
    console.warn(e.target.value, e.target.id)
    this.setState({
      [key]: value
    })
    console.warn(e.target.value, e.target.id)
  }

  updatePlot() {
    console.warn("UPDATING PLOT")
    // Start constructing query for image
    let plot_query = {
      dataset: this.props.dataset,
      quantum: this.props.quantum,
      point: this.props.point,
      showmap: this.state.showmap,
      names: this.props.names,
      size: this.state.size,
      dpi: this.state.dpi,
      plotTitle: this.state.plotTitles[this.state.selected - 1],
    };

    // Manual X-Scale
    if (this.state.xminScale != '' && this.state.xminScale != undefined) {
      if (this.state.xmaxScale != '' && this.state.xmaxScale != undefined) {
        plot_query.xscale = [this.state.xminScale, this.state.xmaxScale]
        console.warn("PLOT QUERY: ", plot_query)
      }
    }
    
    // Manual Y-Scale
    if (this.state.yminScale != '' && this.state.yminScale != undefined) {
      if (this.state.ymaxScale != '' && this.state.ymaxScale != undefined) {
        plot_query.yscale = [this.state.ymaxScale, this.state.yminScale]
      }
    }
    
    // Manual Plot Title
    if (this.state.title != undefined && this.state.title != '') {
      plot_query.title = this.state.title
    }

    // Manual X Label
    if (this.state.xlabel != '' && this.state.xlabel != undefined) {
      plot_query.xlabel = this.state.xlabel
    }

    // Manual Y Label
    if (this.state.ylabel != '' && this.state.ylabel != undefined) {
      plot_query.ylabel = this.state.ylabel
    }


    switch (this.state.selected) {
      case TabEnum.PROFILE:
        plot_query.type = "profile";
        plot_query.time = this.props.time;
        plot_query.variable = this.state.variable;
        break;

      case TabEnum.CTD:
        plot_query.type = "profile";
        plot_query.time = this.props.time;
        plot_query.variable = "";
        if (this.state.variables.indexOf("votemper") !== -1) {
          plot_query.variable += "votemper,";
        } else if (this.state.variables.indexOf("temp") !== -1) {
          plot_query.variable += "temp,";
        }
        if (this.state.variables.indexOf("vosaline") !== -1) {
          plot_query.variable += "vosaline";
        } else if (this.state.variables.indexOf("salinity") !== -1) {
          plot_query.variable += "salinity";
        }
        break;

      case TabEnum.TS:
        plot_query.type = "ts";
        plot_query.time = this.props.time;
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
        }
        break;

      case TabEnum.SOUND:
        console.warn("SOUND SPEED PROFILE")
        plot_query.type = "sound";
        plot_query.time = this.props.time;
        break;
      case TabEnum.OBSERVATION:
        plot_query.type = "observation";
        plot_query.observation = this.props.point.map(function (o) {
          return o[2];
        });

        plot_query.observation_variable = this.state.observation_variable;
        plot_query.variable = this.state.variable;

        break;
      case TabEnum.MOORING:
        plot_query.type = "timeseries";
        plot_query.variable = this.props.variable;
        plot_query.starttime = this.state.starttime;
        plot_query.endtime = this.props.time;
        plot_query.depth = this.state.depth;
        plot_query.colormap = this.state.colormap;
        plot_query.scale = this.state.scale;

        if (this.state.depth == "all") {
          // Add Colormap selector
          inputs.push(
            <ComboBox
              key='colormap'
              id='colormap'
              state={this.state.colormap}
              def='default'
              onUpdate={this.onLocalUpdate}
              url='/api/colormaps/'
              title={_("Colourmap")}>{_("colourmap_help")}<img src="/colormaps.png" />
            </ComboBox>);
        }

        break;
      case TabEnum.STICK:
        plot_query.type = "stick";
        plot_query.variable = this.state.variable;
        plot_query.starttime = this.state.starttime;
        plot_query.endtime = this.props.time;
        plot_query.depth = this.state.depth;
        break;
    }
    console.warn("SETTING STATE TO NEW QUERY")
    this.setState({
      query: plot_query
    }, () => {
      console.warn(this.state.query)
    })
  }

  render() {

    _("Dataset");
    _("Time");
    _("Location");
    _("Start Time");
    _("End Time");
    _("Depth");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Saved Image Size");



    // Rendered across all tabs
    if (this.props.point.length === 1) {
      <div>
        <LocationInput
          key='point'
          id='point'
          state={this.props.point}
          title={_("Location")}
          onUpdate={this.onLocalUpdate}
        />
        <SelectBox
          key='showmap'
          id='showmap'
          state={this.state.showmap}
          onUpdate={this.onLocalUpdate}
          title={_("Show Location")}>{_("showmap_help")}
        </SelectBox>
      </div>
    } else {
      <SelectBox
        key='showmap'
        id='showmap'
        state={this.state.showmap}
        onUpdate={this.onLocalUpdate}
        title={_("Show Location")}>{_("showmap_help")}
      </SelectBox>
    }
    const location =
      <div>
        <div style={{ display: this.props.point.length == 1 ? "block" : "none", }}>
          <LocationInput
            key='point'
            id='point'
            state={this.props.point}
            title={_("Location")}
            onUpdate={this.onLocalUpdate}
          />
        </div>
        <SelectBox
          key='showmap'
          id='showmap'
          state={this.state.showmap}
          onUpdate={this.onLocalUpdate}
          title={_("Show Location")}>{_("showmap_help")}
        </SelectBox>
      </div>

    const dataset = <ComboBox
      key='dataset'
      id='dataset'
      state={this.props.dataset}
      def=''
      url='/api/datasets/'
      title={_("Dataset")}
      onUpdate={this.props.onUpdate}
    />

    const image_size = <ImageSize
      key='size'
      id='size'
      state={this.state.size}
      onUpdate={this.onLocalUpdate}
      title={_("Saved Image Size")}
    />


    const xscale = (
      <div className='scale_container' key='xscale'>
        <div className='scale_header'>
          X-Axis Scale:
          </div>
        <div className='input_container'>
          <input
            onChange={this.updateScale}
            className='scale'
            id='xminScale'
            value={this.state.xminScale}
            placeholder='min'
          ></input>,
            <input
            onChange={this.updateScale}
            className='scale'
            id='xmaxScale'
            value={this.state.xmaxScale}
            placeholder='max'
          ></input>
        </div>
      </div>
    )
    const yscale = (
      <div className='scale_container' key='yscale'>
        <div className='scale_header'>
          Y-Axis Scale:
        </div>
        <div className='input_container'>
          <input
            onChange={this.updateScale}
            className='scale'
            id='yminScale'
            value={this.state.yminScale}
            placeholder='min'
          ></input>,
            <input
            onChange={this.updateScale}
            className='scale'
            id='ymaxScale'
            value={this.state.ymaxScale}
            placeholder='max'
          ></input>
        </div>
      </div>
    )


    const label = 
      <div className='label_container' key='label'>
        <div className='label_container'>
          <div className='label_header'>
            Plot Title:
          </div>
          <input
            onChange={this.updateScale}
            className='label'
            id='title'
            value={this.state.title}
            placeholder='Plot Title'
          ></input>
        </div>
        <div className='label_container'>
          <div className='label_header'>
            X-Axis Label:
          </div>
          <input
            onChange={this.updateScale}
            className='label'
            id='xlabel'
            value={this.state.xlabel}
            placeholder='X-Axis Label'
          ></input>
        </div>
        
        <div className='label_container'>
          <div className='label_header'>
            Y-Axis Label:
          </div>
          <input
            onChange={this.updateScale}
            className='label'
            id='ylabel'
            value={this.state.ylabel}
            placeholder='Y-Axis Label'
          ></input>
        </div>
      </div>
    

    
    let line1 = <hr key='1' className='line' />
    let line2 = <hr key='2' className='line' />
    let line3 = <hr key='3' className='line' />

    // Show a single time selector on all tabs except Stick and Virtual Mooring.
    const showTime = this.state.selected !== TabEnum.STICK ||
      this.state.selected !== TabEnum.MOORING;
    const time = showTime ? <TimePicker
      key='time'
      id='time'
      state={this.props.time}
      def=''
      quantum={this.props.quantum}
      url={"/api/timestamps/?dataset=" + this.props.dataset + "&quantum=" + this.props.quantum}
      title={_("Time")}
      onUpdate={this.props.onUpdate}
    /> : null;

    // Show a start and end time selector for only Stick and Virtual Mooring tabs.
    const showTimeRange = this.state.selected === TabEnum.STICK ||
      this.state.selected === TabEnum.MOORING;
    const timeRange = showTimeRange ? <div>
      <TimePicker
        key='starttime'
        id='starttime'
        state={this.state.starttime}
        def=''
        quantum={this.props.quantum}
        url={"/api/timestamps/?dataset=" + this.props.dataset + "&quantum=" + this.props.quantum}
        title={_("Start Time")}
        onUpdate={this.onLocalUpdate}
        max={this.props.time}
      />
      <TimePicker
        key='time'
        id='time'
        state={this.props.time}
        def=''
        quantum={this.props.quantum}
        url={"/api/timestamps/?dataset=" + this.props.dataset + "&quantum=" + this.props.quantum} title={_("End Time")}
        onUpdate={this.props.onUpdate}
        min={this.state.starttime}
      /> </div> : null;

    // Only show depth and scale selector for Mooring tab.
    const showDepthVariableScale = this.state.selected === TabEnum.MOORING;
    const depthVariableScale = showDepthVariableScale ? <div>
      <ComboBox
        key='depth'
        id='depth'
        state={this.state.depth}
        def={""}
        onUpdate={this.onLocalUpdate}
        url={"/api/depth/?variable=" + this.props.variable + "&dataset=" + this.props.dataset + "&all=True"}
        title={_("Depth")}></ComboBox>

      <ComboBox
        key='variable'
        id='variable'
        state={this.props.variable}
        def=''
        onUpdate={this.props.onUpdate}
        url={"/api/variables/?vectors&dataset=" + this.props.dataset}
        title={_("Variable")}><h1>{_("Variable")}</h1></ComboBox>

      <Range
        auto
        key='scale'
        id='scale'
        state={this.state.scale}
        def={""}
        onUpdate={this.onLocalUpdate}
        title={_("Variable Range")} />
    </div> : null;

    // Show multidepth selector on for Stick tab
    const showMultiDepthAndVector = this.state.selected === TabEnum.STICK;
    const multiDepthVector = showMultiDepthAndVector ? <div>
      <ComboBox
        key='variable'
        id='variable'
        state={this.state.variable}
        def=''
        onUpdate={this.onLocalUpdate}
        url={"/api/variables/?vectors_only&dataset=" + this.props.dataset}
        title={_("Variable")}><h1>Variable</h1></ComboBox>

      <ComboBox
        key='depth'
        id='depth'
        multiple
        state={this.state.depth}
        def={""}
        onUpdate={this.onLocalUpdate}
        url={"/api/depth/?variable=" + this.state.variable + "&dataset=" + this.props.dataset}
        title={_("Depth")}></ComboBox>
    </div> : null;


    // Create Variable dropdown for Profile and Observation
    const showProfileVariable = this.state.selected == TabEnum.PROFILE ||
      this.state.selected == TabEnum.OBSERVATION;
    const profilevariable = showProfileVariable ? <ComboBox
      key='variable'
      id='variable'
      multiple
      state={this.state.variable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={"/api/variables/?3d_only&dataset=" + this.props.dataset + "&anom"}
      title={_("Variable")}><h1>Variable</h1></ComboBox> : null;

    let observation_data = [];
    let observation_variable = <div></div>;
    if (this.props.point[0][2] !== undefined) {
      if (typeof (this.props.point[0][2]) == "number") {
        observation_variable = <ComboBox
          key='observation_variable'
          id='observation_variable'
          state={this.state.observation_variable}
          url='/api/observationvariables/'
          title={_("Observation Variable")}
          multiple
          onUpdate={this.onLocalUpdate}
        />;
      }
      else {
        observation_data = this.props.point[0][2].datatypes.map(
          function (o, i) {
            return { id: i, value: o.replace(/ \[.*\]/, "") };
          }
        );
        observation_variable = <ComboBox
          key='observation_variable'
          id='observation_variable'
          state={this.state.observation_variable}
          data={observation_data}
          title={_("Observation Variable")}
          multiple
          onUpdate={this.onLocalUpdate}
        />;
      }
    }

    // Checks if the current dataset's variables contain Temperature
    // and Salinity. This is used to enable/disable some tabs.
    const hasTempSalinity =
      (this.state.variables.indexOf("votemper") !== -1 ||
        this.state.variables.indexOf("temp") !== -1) &&
      (this.state.variables.indexOf("vosaline") !== -1 ||
        this.state.variables.indexOf("salinity") !== -1);

    const permlink_subquery = {
      selected: this.state.selected,
      scale: this.state.scale,
      depth: this.state.depth,
      colormap: this.state.colormap,
      starttime: this.state.starttime,
    };
    let inputs = [];
    console.warn("SELECTED: ", this.state.selected)
    switch (this.state.selected) {
      case TabEnum.PROFILE:
        inputs = [time, line1, dataset, profilevariable, line2, xscale, yscale, label, image_size];
        break;
      case TabEnum.CTD:
        inputs = [line1, time, dataset, label, image_size];
        break;
      case TabEnum.TS:
        inputs = [line1, time, dataset, label, image_size];
        break;
      case TabEnum.SOUND:
        console.warn("SELECTED CASE")
        inputs = [line1, time, line2, dataset, line3, xscale, yscale, label, image_size];
        console.warn("BEFORE BREAK")
        break;
      case TabEnum.OBSERVATION:
        inputs = [line1, dataset, observation_variable, profilevariable, label, image_size];
        break;
      case TabEnum.MOORING:
        inputs = [line1, timeRange, dataset, depthVariableScale, label, image_size];
        if (this.state.depth == "all") {
          // Add Colormap selector
          inputs.push(
            <ComboBox
              key='colormap'
              id='colormap'
              state={this.state.colormap}
              def='default'
              onUpdate={this.onLocalUpdate}
              url='/api/colormaps/'
              title={_("Colourmap")}>{_("colourmap_help")}<img src="/colormaps.png" />
            </ComboBox>);
        }
        break;
      case TabEnum.STICK:
        inputs = [line1, timeRange, dataset, multiDepthVector, label, image_size];
        break;
    }

    let plot_image = <img src={Spinner} />
    if (this.state.query != undefined) {
      plot_image = <PlotImage
        query={this.state.query} // For image saving link.
        permlink_subquery={permlink_subquery}
        action={this.props.action}
      />
    }
    console.warn("BEFORE RETURNING")
    return (
      <div className='PointWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect}>
          <NavItem
            eventKey={TabEnum.PROFILE}>{_("Profile")}</NavItem>
          <NavItem
            eventKey={TabEnum.CTD}
            disabled={!hasTempSalinity}>{_("CTD Profile")}</NavItem>
          <NavItem
            eventKey={TabEnum.TS}
            disabled={!hasTempSalinity}>{_("T/S Diagram")}</NavItem>
          <NavItem
            eventKey={TabEnum.SOUND}
            disabled={!hasTempSalinity}>{_("Sound Speed Profile")}</NavItem>
          <NavItem
            eventKey={TabEnum.STICK}>{_("Stick Plot")}</NavItem>
          <NavItem
            eventKey={TabEnum.OBSERVATION}
            disabled={this.props.point[0][2] === undefined}
          >{_("Observation")}</NavItem>
          <NavItem
            eventKey={TabEnum.MOORING}>{_("Virtual Mooring")}</NavItem>
        </Nav>
        <Row>
          <Col lg={3}>
            <Panel
              key='global_settings'
              id='global_settings'
              collapsible
              defaultExpanded
              header={_("Global Settings")}
              bsStyle='primary'
            >
              {location}
              {inputs}
              <Button
                onClick={this.updatePlot}
              >Apply Changes</Button>
            </Panel>
          </Col>
          <Col lg={9}>
            {plot_image}
          </Col>
        </Row>
      </div>
    );
  }
}

//***********************************************************************
PointWindow.propTypes = {
  generatePermLink: PropTypes.func,
  point: PropTypes.array,
  time: PropTypes.number,
  variable: PropTypes.string,
  dpi: PropTypes.number,
  names: PropTypes.array,
  quantum: PropTypes.string,
  dataset: PropTypes.string,
  onUpdate: PropTypes.func,
  scale: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  depth: PropTypes.number,
  init: PropTypes.object,
  action: PropTypes.func,
  dataset_compare: PropTypes.bool,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  dataset_1: PropTypes.object,
};
