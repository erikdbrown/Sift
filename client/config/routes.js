import React, { Component } from 'react'
import main from '../components/main.jsx'
import dataEntry from '../components/createData.jsx'
import homepage from '../components/homepage.jsx'
import dataVis from '../components/dataVis.jsx'
import routes from '../config/routes.js'
import { Route, IndexRoute} from 'react-router'


export default (
  <Route path='/' component={main}>
    <Route path='home' component={homepage}/>
    <Route path='create' component={dataEntry}/>
    <Route path='visual' component={dataVis}/>
  </Route>
)