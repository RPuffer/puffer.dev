import React from 'react';
import styled, { keyframes } from 'styled-components'
import base from './base.png';
import logo from './rotate-logo.png';

const fader = keyframes`
    0% {
        opacity: 1;
    }
    25% {
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
    75% {
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
`

const Logo = styled.img`
    animation: ${fader} infinite 10s linear;
    height: 40vmin;
    pointer-events: none;
    position: absolute;
    left: 0;
`
const Base = styled.img`
    height: 40vmin;
    position: absolute;
    left: 0;
`
const Container = styled.div`
    height: 40vmin;
    width: 40vmin;
    position: relative;
`

class Home extends React.Component {
	render() {
		return (
            <React.Fragment>
                <Container>
                    <Base src={base} alt="base" />
                    <Logo src={logo} alt="logo" />
                </Container>
                <p>
                    Under construction.
                </p>
            </React.Fragment>
		);
	}
}

export default Home;
