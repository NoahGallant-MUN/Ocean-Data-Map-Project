import React from "react";
import PropTypes from "prop-types";

import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import DrifterWindow from "./DrifterWindow.jsx";
import Class4Window from "./Class4Window.jsx";

const i18n = require("../i18n.js");

function formatLatLon(latitude, longitude) {
    let formatted = "";
    formatted += Math.abs(latitude).toFixed(4) + " ";
    formatted += (latitude >= 0) ? "N" : "S";
    formatted += ", ";
    formatted += Math.abs(longitude).toFixed(4) + " ";
    formatted += (longitude >= 0) ? "E" : "W";
    
    return formatted;
  }

export default class ModalContainer extends React.Component {
  constructor(props) {
    super(props);
    
  }

  render() {    
    
    let layer = Object.keys(this.props.data)[0]
    let modalTitle = ''
    let modalContent = ''
    let data =  this.props.data['left']
    
    // Selects the type of Shape / Obs
    switch(this.props.modal) {
        case "point":
        modalContent = (
          <PointWindow
            data={data}  // Non compare data
            data_compare={'right' in this.props.data ? this.props.data['right'] : {}}
            //dataset={this.props.data[layer]['dataset']}
            //quantum={this.props.data[layer]['quantum']}
            point={this.props.point}
            //variable={this.props.data[layer]['variable']}
            //depth={this.props.data[layer]['depth']}
            //time={this.props.data[layer].time} // ????
            //starttime={this.props.data[layer].time} // ????
            //scale={this.props.data[layer]['scale']}
            //colormap={this.props.data[layer]['colourmap']}
            names={this.props.names}
            onUpdate={this.props.onUpdate}
            init={this.props.init}
            dataset_compare={this.props.dataset_compare}
            //dataset_1={this.props.dataset_1}
            action={this.props.action}
            showHelp={this.props.showHelp}
            swapViews={this.props.swapViews}
          />
        );
        modalTitle = formatLatLon(
          this.props.point[0][0],
          this.props.point[0][1]
        );
        break;
      case "line":
        modalContent = (
          <LineWindow
            data={data}   // Non compare data
            data_compare={'right' in this.props.data ? this.props.data['right']: {}}
            //dataset_0={this.state.dataset}
            //quantum={this.state.quantum}
            line={this.props.line}
            //variable={this.state.variable}
            //depth={this.state.depth}
            //time={this.state.time}
            //starttime={this.state.time}
            //scale={this.state.scale}
            //scale_1={this.state.scale}
            //colormap={this.props.colourmap}
            names={this.props.names}
            onUpdate={this.props.updateState}
            init={this.props.init}
            //dataset_compare={this.props.dataset_compare}
            //dataset_1={this.state.dataset}
            action={this.props.action}
            showHelp={this.props.showHelp}
            swapViews={this.props.swapViews}
          />
        );

        modalTitle = "(" + this.props.line[0].map(function(ll) {
          return formatLatLon(ll[0], ll[1]);
        }).join("), (") + ")";
        break;
      case "area":
        modalContent = (
          <AreaWindow
            data={data}
            data_compare={'right' in this.props.data ? this.props.data['right']: {}}
            //dataset_0={this.state}
            area={this.props.area}
            //scale={this.state.scale}
            //scale_1={this.state.scale_1}
            //colormap={this.state.colormap}
            names={this.props.names}
            //depth={this.state.depth}
            projection={this.props.projection}
            //variable={this.state.variable}
            onUpdate={this.props.updateState}
            init={this.props.init}
            dataset_compare={this.props.dataset_compare}
            //dataset_1={this.state.dataset_1}
            showHelp={this.props.showHelp}
            action={this.props.action}
            swapViews={this.props.swapViews}
            options={this.props.options}
          />
        );

        modalTitle = "";
        break;
      case "drifter":
        modalContent = (
          <DrifterWindow
            data={data}
            //dataset={this.state.dataset}
            //quantum={this.state.dataset_quantum}
            drifter={this.props.drifter}
            //variable={this.state.variable}
            //scale={this.state.scale}
            names={this.props.names}
            //depth={this.state.depth}
            onUpdate={this.props.updateState}
            init={this.props.init}
            action={this.props.action}
          />
        );

        modalTitle = "";
        break;
      case "class4":
        modalContent = (
          <Class4Window
            class4id={this.props.class4}
            init={this.props.init}
            action={this.props.action}
          />
        );
        modalTitle = "";
        break;
    }

    return (
        <div>
            {modalContent}
        </div>
    );
  }
}

//***********************************************************************
ModalContainer.propTypes = {
    modal: PropTypes.string
};