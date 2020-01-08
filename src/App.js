import React, { Component } from 'react';
import styled from 'styled-components'
import base from './base.png';
import logo from './rotate-logo.png';
import gh from './GitHub-Mark-Light.png';
import home from './home.png';
import sail from './sail.png';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import './App.css';
import SailBtn from './Sail';

const GH = styled.a`
  position: absolute;
  left: 10px;
  top: 10px;

  img {
    width: 24px;
    height: 24px;
  }
`
const Home = styled.a`
  position: absolute;
  left: 10px;
  top: 52px;

  img {
    width: 24px;
    height: 24px;
  }
`
const Sail = styled.a`
  position: absolute;
  left: 10px;
  top: 89px;

  img {
    width: 24px;
    height: 24px;
  }
`

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <Router>
            <Switch>
              <Route exact path="/">
                <div className="App-logo-container">
                    <img src={base} className="App-logo-base" alt="base" />
                    <img src={logo} className="App-logo" alt="logo" />
                  </div>
                  <p>
                    Under construction.
                  </p>
              </Route>
              <Route path="/sail">
                <SailBtn />
              </Route>
            </Switch>
          </Router>
          <GH href="https://github.com/RPuffer/puffer.dev">
            <img src={gh} alt="github source"/>
          </GH>
          <Home href="/">
            <img src={home} alt="github source"/>
          </Home>
          <Sail href="/sail">
            <img src={sail} alt="github source"/>
          </Sail>
        </header>
      </div>
    );
  }
}

export default App;
