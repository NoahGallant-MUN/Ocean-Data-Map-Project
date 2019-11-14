/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image corresponding to a Selected Point

*/


import React from "react";
import { Nav, NavItem, Panel, Row, Col, Button } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import SelectBox from "./SelectBox.jsx";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import LocationInput from "./LocationInput.jsx";
import Range from "./Range.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import Scale from "./Scale.jsx";
import PlotLabel from "./PlotLabel.jsx";

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
      annotate: false,
      variable: [props.variable],
      observation_variable: [7],
      size: "10x7",
      dpi: 144,
      plotTitles: Array(7).fill(""),
      plotsettings: {}
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
    this.applyPlotSettings = this.applyPlotSettings.bind(this);
    this.updatePlotSetting = this.updatePlotSetting.bind(this);

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

  componentDidUpdate(prevProps, prevState) {
    
    if ((stringify(this.props) !== stringify(prevProps) || stringify(this.state) !== stringify(prevState)) && this._mounted) {
      const state = {};

      if (!Array.isArray(this.state.depth)) {
        state.depth = this.props.depth;
      }
      if (this.state.scale.indexOf("auto") !== -1) {
        state.scale = this.props.scale + ",auto";
      }
      else {
        state.scale = this.props.scale;
      }

      this.setState(state);

      // Check if dataset was changed
      if (this.props.dataset !== prevProps.dataset) {
        this.populateVariables(this.props.dataset);
      }


      // Update Plot Query
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
          plot_query.type = "sound";
          plot_query.time = this.props.time;
          plot_query.annotate = this.state.annotate
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
          break;

        case TabEnum.STICK:
          plot_query.type = "stick";
          plot_query.variable = this.state.variable;
          plot_query.starttime = this.state.starttime;
          plot_query.endtime = this.props.time;
          plot_query.depth = this.state.depth;
          break;
      }

      this.setState({
        plot_query: plot_query
      })
    }
  }

  populateVariables(dataset) {
    $.ajax({
      url: "/api/v1.0/variables/?dataset=" + dataset,
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
          });
        }
      }.bind(this),

      error: function (xhr, status, err) {
        if (this._mounted) {
          console.error(this.props.url, status, err.toString());
        }
      }.bind(this)
    });
  }

  applyPlotSettings() {
    let plot_query = jQuery.extend({}, this.state.plot_query);
    plot_query['plotsettings'] = jQuery.extend({}, this.state.plotsettings);
    
    this.setState({
      plot_query: plot_query
    });
  }
  updatePlotSetting(key, value) {
    console.warn("KEY: ", key)
    console.warn("VALUE: ", value)
    let plotSettings = this.state.plotsettings;

    plotSettings[key] = value;

    this.setState({
      plotsettings: plotSettings
    })
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
    this.setState({
      selected: key
    });
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

    const select_dataset = (
      <ComboBox
        key='dataset'
        id='dataset'
        state={this.props.dataset}
        def=''
        url='/api/v1.0/datasets/'
        title={_("Dataset")}
        onUpdate={this.props.onUpdate}
      />

    )
    const toggle_map = (
      <SelectBox
        key='showmap'
        id='showmap'
        state={this.state.showmap}
        onUpdate={this.onLocalUpdate}
        title={_("Show Location")}>{_("showmap_help")}
      </SelectBox>
    )

    const toggle_annotations = (
      <SelectBox
        key='annotate'
        id='annotate'
        state={this.state.annotate}
        onUpdate={this.onLocalUpdate}
        title={_("Show Annotations")}>
      </SelectBox>
    )

    const select_location = (
      <div style={{ display: this.props.point.length == 1 ? "block" : "none", }}>
        <LocationInput
          key='point'
          id='point'
          state={this.props.point}
          title={_("Location")}
          onUpdate={this.onLocalUpdate}
        />
      </div>
    )

    const select_imagesize = (
      <ImageSize
        key='size'
        id='size'
        state={this.state.size}
        onUpdate={this.onLocalUpdate}
        title={_("Saved Image Size")}
      />
    )

    const select_plottitle = (
      /*<CustomPlotLabels
        key='title'
        id='title'
        title={_("Plot Title")}
        updatePlotTitle={this.updatePlotTitle}
        plotTitle={this.state.plotTitles[this.state.selected - 1]}
      ></CustomPlotLabels>*/
      <PlotLabel
        title='Plot Title'
        onChange={this.updatePlotSetting}
        labelID='title'
        value={this.state.plotsettings.title}
      ></PlotLabel>
    )

    const select_xlabel = (
      <PlotLabel
        title='X Label'
        onChange={this.updatePlotSetting}
        labelID='xlabel'
        value={this.state.plotsettings.xlabel}
      ></PlotLabel>
    )

    const select_xscale = (
      <Scale
        title='X Scale'
        onChange={this.updatePlotSetting}
        minID='xmin'
        maxID='xmax'
        min={this.state.plotsettings.xmin}
        max={this.state.plotsettings.xmax}
      ></Scale>
    )

    const select_ylabel = (
      <PlotLabel
        title='Y Label'
        onChange={this.updatePlotSetting}
        labelID='ylabel'
        value={this.state.plotsettings.ylabel}
      ></PlotLabel>
    )

    const select_yscale = (
      <Scale
        title='Y Scale'
        onChange={this.updatePlotSetting}
        onApply={this.applyPlotSettings}
        minID='ymin'
        maxID='ymax'
        min={this.state.plotsettings.ymin}
        max={this.state.plotsettings.ymax}
      ></Scale>
    )

    // Show a single time selector on all tabs except Stick and Virtual Mooring.
    const showTime = this.state.selected !== TabEnum.STICK ||
      this.state.selected !== TabEnum.MOORING;
    const time = showTime ? <TimePicker
      key='time'
      id='time'
      state={this.props.time}
      def=''
      quantum={this.props.quantum}
      url={"/api/v1.0/timestamps/?dataset=" + this.props.dataset + "&variable=" + this.props.variable}
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
        url={"/api/v1.0/timestamps/?dataset=" + this.props.dataset + "&variable=" + this.props.variable}
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
        url={"/api/v1.0/timestamps/?dataset=" + this.props.dataset + "&variable=" + this.props.variable}
        title={_("End Time")}
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
        url={"/api/v1.0/depth/?variable=" + this.props.variable + "&dataset=" + this.props.dataset + "&all=True"}
        title={_("Depth")}></ComboBox>

      <ComboBox
        key='variable'
        id='variable'
        state={this.props.variable}
        def=''
        onUpdate={this.props.onUpdate}
        url={"/api/v1.0/variables/?vectors&dataset=" + this.props.dataset}
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
        url={"/api/v1.0/variables/?vectors_only&dataset=" + this.props.dataset}
        title={_("Variable")}><h1>Variable</h1></ComboBox>

      <ComboBox
        key='depth'
        id='depth'
        multiple
        state={this.state.depth}
        def={""}
        onUpdate={this.onLocalUpdate}
        url={"/api/v1.0/depth/?variable=" + this.state.variable + "&dataset=" + this.props.dataset}
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
      url={"/api/v1.0/variables/?3d_only&dataset=" + this.props.dataset}
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

    let datainputs = [];
    let plotinputs = [];
    let saveinputs = [];

    switch (this.state.selected) {
      case TabEnum.PROFILE:
        datainputs = [select_location, toggle_map, select_dataset, profilevariable, time]
        plotinputs = [select_plottitle]
        saveinputs = [select_imagesize]
        break;

      case TabEnum.CTD:
        datainputs = [select_location, toggle_map, select_dataset, time];
        plotinputs = []
        saveinputs = [select_imagesize]
        break;

      case TabEnum.TS:
        datainputs = [select_location, toggle_map, select_dataset, time];
        plotinputs = []
        saveinputs = [select_imagesize]
        break;

      case TabEnum.SOUND:
        datainputs = [select_location, toggle_map, select_dataset, time];
        plotinputs = [select_plottitle, select_xlabel, select_xscale, select_ylabel, select_yscale]
        saveinputs = [select_imagesize]
        break;

      case TabEnum.OBSERVATION:
        datainputs = [select_location, toggle_map, select_dataset, observation_variable];
        plotinputs = []
        saveinputs = [select_imagesize]
        break;

      case TabEnum.MOORING:
        datainputs = [select_location, toggle_map, select_dataset, timeRange, depthVariableScale]
        plotinputs = []
        saveinputs = [select_imagesize]
        if (this.state.depth == "all") {
          // Add Colormap selector
          datainputs.push(
            <ComboBox
              key='colormap'
              id='colormap'
              state={this.state.colormap}
              def='default'
              onUpdate={this.onLocalUpdate}
              url='/api/v1.0/colormaps/'
              title={_("Colourmap")}>{_("colourmap_help")}<img src="/colormaps.png" />
            </ComboBox>);
        }

      case TabEnum.STICK:
        datainputs = [select_location, toggle_map, select_dataset, timeRange, multiDepthVector]
        plotinputs = []
        saveinputs = [select_imagesize]
        break;
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

    let image = []
    if (this.state.plot_query !== undefined) {
      image.push(
        <PlotImage
          query={this.state.plot_query} // For image saving link.
          permlink_subquery={permlink_subquery}
          action={this.props.action}
        />
      )
    }

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
            disabled
            eventKey={TabEnum.STICK}>{_("Stick Plot")}</NavItem>
          <NavItem
            eventKey={TabEnum.OBSERVATION}
            disabled={this.props.point[0][2] === undefined}
          >{_("Observation")}</NavItem>
          <NavItem
            eventKey={TabEnum.MOORING}>{_("Virtual Mooring")}</NavItem>
        </Nav>
        <Row>
          <Col lg={2}>

            <Panel
              key='global_settings'
              id='global_settings'
              collapsible
              defaultExpanded
              header={_("Global Settings")}
              bsStyle='primary'
            >
              {datainputs}
            </Panel >
          </Col>
          <Col lg={8}>
            {image}
          </Col>
          <Col lg={2}>

            <Panel
              key='plot_settings'
              id='plot_settings'
              collapsible
              defaultExpanded
              header={_("Plot Settings")}
              bsStyle='primary'
            >
              {plotinputs}
              <Button
                onClick={this.applyPlotSettings}
              >Apply</Button>
            </Panel >
            <Panel
              key='save_settings'
              id='save_settings'
              collapsible
              defaultExpanded
              header={_("Save Settings")}
              bsStyle='primary'
            >
              {saveinputs}
            </Panel >
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
