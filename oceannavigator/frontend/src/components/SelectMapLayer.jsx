import React from 'react';
import * as ol from "ol";
import * as olproj from "ol/proj";
import * as olproj4 from "ol/proj/proj4";
import * as olcontrol from "ol/control";
import * as olsource from "ol/source";
import * as olloadingstrategy from "ol/loadingstrategy";
import * as olformat from "ol/format";
import * as oltilegrid from "ol/tilegrid";
import * as ollayer from "ol/layer";
import * as olstyle from "ol/style";
import * as olinteraction from "ol/interaction";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olextent from "ol/extent";

export default class SelectMapLayer extends React.Component {
    constructor (props) {
        super (props)
    }

    render () {

        let buttons = undefined;


        console.warn("MAP: ", this.props.map)
        if (this.props.map !== undefined) {
            console.warn("MAP 2: ", this.props.map)
            let layers = this.props.map.getLayers();
            console.warn("LAYERS: ", layers)
            for (let x in layers) {
                console.warn("X: ", x);
            }
        }
        

        return (
            <div>
                Unfortunately multi-layer plotting is not currently available.
                Please select a layer before continuing:
                {buttons}
            </div>
        )
    }
}