
import React, { Component } from 'react'
import { createTable } from '../utils/utils.js'
import Selections from './selections.jsx'
import { Menu, MenuItem} from 'material-ui'
import h from '../config/helpers'
import Dropdown from './dropdown.jsx'
import faker from 'faker'
/*
  == Material UI componenets ==
*/
import Paper from 'material-ui/lib/paper'

//refactor into css file
const style = {
  marginRight: '32',
  marginBottom: '32',
  float: 'left',
  position: 'relative',
  zIndex: 0
};

class DataEntry extends Component {

  componentDidMount() {
    //subscribe to the store
    const { store } = this.context;
    console.log(store.getState());

    this.unsubscribe = store.subscribe(() => {
      console.log('updatin disptachid');
      this.forceUpdate()
      }
    );

    var user = localStorage.getItem('sift-user');
    if (!user) {
      h.setUser(function(dbUser) {
        localStorage.setItem('sift-user', dbUser);
      })
    }
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render () {
    const { MenuOptions, CurrentSelections } = this.context.store.getState().buildTable;
    console.log(MenuOptions, CurrentSelections)
    return (
      <div className='dataEntry'>
        <Paper className='select'>
          <Dropdown menuOptions={MenuOptions} className='dropdown'/>
        </Paper>
        <Paper className='selectionList'>
          <div>
            <Selections selected={CurrentSelections}/>
          </div>
        </Paper>
      </div>
    )
  }
}
DataEntry.contextTypes = {
  store: React.PropTypes.object
}
export default DataEntry