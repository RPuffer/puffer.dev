import React, { Component } from 'react';
import styled from 'styled-components'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
} from "react-router-dom";
import Sail from './Sail';
import Home from './Home';

const Nav = styled.div`
  position: fixed
  display: flex;
  flex-direction: row-reverse;
  right: 20px;
  bottom: 20px;
  img {
    padding: 10px;
    width: 24px;
    height: 24px;
    opacity: 0.75;
  }
`

const Base = styled.header`
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
  text-align: center;
`

class App extends Component {
  render() {
    return (
      <Base>
        <Router>
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>
            <Route path="/sail">
              <Sail />
            </Route>
          </Switch>
        <Nav>
          <a href="https://github.com/RPuffer/puffer.dev">
            <img src="/GH.png" alt="Source"/>
          </a>
          <Link to="/">
            <img src="/home.png" alt="Home"/>
          </Link>
          <Link to="/sail">
            <img src="/sail.png" alt="Sail"/>
          </Link>
        </Nav>
        </Router>
      </Base>
    );
  }
}

export default App;
