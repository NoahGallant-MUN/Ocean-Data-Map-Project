import React from 'react';


export default class SelectMapLayer extends React.Component {
    constructor (props) {
        super (props)
    }

    render () {

        let buttons = undefined;

        for (let x in this.props.map) {
            console.warn("X: ", x);
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