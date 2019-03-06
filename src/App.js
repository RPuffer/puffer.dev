import React, { Component } from 'react';
import base from './base.png';
import logo from './rotate-logo.png';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <div className="App-logo-container">
            <img src={base} className="App-logo-base" alt="base" />
            <img src={logo} className="App-logo" alt="logo" />
          </div>
          <p>
            Under construction.
          </p>
        </header>
      </div>
    );
  }
}

export default App;
