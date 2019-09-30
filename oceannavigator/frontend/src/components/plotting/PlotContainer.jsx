import React from 'react';
import PlotSelectionBar from './PlotSelectionBar.jsx';
import PlotSelectionButtons from './PlotSelectionButtons.jsx';
import _ from 'lodash';
import * as SoundSpeedProfile from './SoundSpeedProfile/SoundSpeedProfile.jsx';

export default class PlotContainer extends React.Component {

    constructor(props) {

        super(props);

        this.state = {
            selectPlot: true,

            buttons: {
                'Sound Speed Profile': {
                    state: false,
                    disabled: false,
                    id: 'soundspeedprofile'
                },
                'Temperature Profile': {
                    state: false,
                    disabled: false,
                    id: 'temperatureprofile'
                },
                'Stick Plot': {
                    state: false,
                    disabled: false,
                    id: 'stickplot'
                },
                'CTD Profile': {
                    state: false,
                    disabled: false,
                    id: 'ctdprofile'
                },
                'test': {
                    state: false,
                    disabled: false,
                    id: 'test'
                },
                'test': {
                    state: false,
                    disabled: false,
                    id: 'test'
                }
            },

            current_plots: []

        }
        this.togglePlotSelection = this.togglePlotSelection.bind(this);
        this.toggle = this.toggle.bind(this);
    }

    /*
        Toggles whether we are showing the plot or the plot selection
    */
    togglePlotSelection(state) {
        this.setState({
            selectPlot: state,
        })
    }


    /*
        This function is executed when one of the plot selection buttons is clicked

        Requires: The name of the plot type and whether it's adding, removing, or updating the plot
        Ensures:
    */
    toggle(name, state) {
        this.togglePlotSelection(state);

        let plot_image = SoundSpeedProfile.plot(this.props.map_left)
        
        let plots = this.state.current_plots;
        /*plots[name] = {
            image: plot_image,
            options: 'none',
            id: name
        }*/

        plots.push({
            image: plot_image,
            options: 'none',
            id: name,
        })

        this.setState({
            current_plots: plots,
        })
    }


    render() {

        //  Available plots are all the plot functions where enabled() return true
        //  Grey out the plots that aren't available

        let availablePlots = [];
        let plotSelection = [];
        plotSelection.push(
            <PlotSelectionBar
                togglePlotSelection={this.togglePlotSelection}
                currentState={this.state.selectPlot}
                closeModal={() => { console.warn("FEATURE NOT IMPLEMENTED") }}
            ></PlotSelectionBar>
        )
        if (this.state.selectPlot || this.state.current_plots === {}) {
            plotSelection.push(
                <PlotSelectionButtons
                    buttonNames={this.state.buttons}
                    toggle={this.toggle}
                ></PlotSelectionButtons>
            )
        } else {
        
            // Split plots into groups
            let num_elems = Object.keys(this.state.current_plots).length;
        
            for (let elem = 0; elem < num_elems / 2; elem++) {
                for (let i = 0; i < 1; i++) {
                    console.warn(this.state.current_plots)
                    console.warn(elem * num_elems + i)
                    availablePlots.push(this.state.current_plots[(elem * num_elems) + i].image);
                }
            }

            //availablePlots.push(this.state.current_plots.soundspeedprofile.image)
        }

        //  Options toolbar for the plot (should be fetched from the plot)
        let options = undefined;
        //options = this.selectedPlot.getOptions(this.props.map.getLayers());

        //  Plot should come from the selected plotting function
        let plot = undefined;
        //plot = this.selectedPlot.plot(this.props.map.getLayers());

        return (
            <div className='PlotContainer'>
                <div>
                    {plotSelection}
                    {options}
                    {availablePlots}
                </div>
            </div>
        )
    }
}