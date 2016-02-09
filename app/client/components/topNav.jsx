
import React, {Component} from 'react';
import { AppBar, Colors, FontIcon } from 'material-ui'
import IconMenu from 'material-ui/lib/menus/icon-menu';
import IconButton from 'material-ui/lib/icon-button';
import NavigationExpandMoreIcon from 'material-ui/lib/svg-icons/navigation/expand-more';
import MenuItem from 'material-ui/lib/menus/menu-item';
import DropDownMenu from 'material-ui/lib/DropDownMenu';
import RaisedButton from 'material-ui/lib/raised-button';
import Toolbar from 'material-ui/lib/toolbar/toolbar';
import ToolbarGroup from 'material-ui/lib/toolbar/toolbar-group';
import ToolbarSeparator from 'material-ui/lib/toolbar/toolbar-separator';
import ToolbarTitle from 'material-ui/lib/toolbar/toolbar-title';

let styles = {
  backgroundColor: '#121F1F',
  width: '105%',
  position: 'relative',
  bottom: '8px',
  right: '10px',
  marginLeft: '-5px'
}
let buttonStyle = {
  color: 'white'
}

class TopNav extends Component {
  constructor() {
    super()
  }

  signout() {
    localStorage.removeItem('sift-user');
    return fetch('/signout', {
      credentials: 'same-origin'
    })
    .then(() => window.location.assign('/'));
  }
  
  render() {
    return (
      <Toolbar style={styles}>
        <ToolbarGroup float="right">
          <FontIcon className="muidocs-icon-custom-sort" />
          <ToolbarSeparator />
          <RaisedButton style={buttonStyle} onClick={ this.signout } label="Sign Out"  />
        </ToolbarGroup>
      </Toolbar>
    )
  }
}

TopNav.contextTypes = {
  router: React.PropTypes.object.isRequired
}

export default TopNav;