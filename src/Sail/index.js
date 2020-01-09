import React from 'react';
import styled from 'styled-components'
import sail from './sail.mp3'
import btn from './btn.png'
import btnHover from './btn-hover.png'
import btnClick from './btn-click.png'

const Container = styled.div`
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	background: ${p => p.bg};
`;

const FancyBtn = styled.img`
	border: 10px solid rgba(255,255,255,${p => p.opacity});
	border-radius: 10px;
	box-shadow: -10px 10px 25px -13px rgba(0,0,0,1);
	width: 30vmin;
`


class Sail extends React.Component {
	state = {
		mousein: false,
		button: btn,
		audio: new Audio(sail),
		opacity: '0.1'
	}

	handleMouseLeave = () => {
		this.setState({ button: btn, mousein: false, opacity: '0.1' })
	}
	handleMouseEnter = () => {
		this.setState({ button: btnHover, mousein: true, opacity: '0.4' })
	}
	handleMouseDown = () => {
		this.state.audio.play()
		this.setState({ button: btnClick })
	}
	handleMouseUp = () => {
		const { mousein } = this.state;
		this.setState({ button: mousein ? btnHover : btn })
	}

	render() {
		return (
		  <Container>
			<FancyBtn opacity={this.state.opacity} src={this.state.button} alt="imabutton"
				onMouseEnter={this.handleMouseEnter}
				onMouseLeave={this.handleMouseLeave}
				onMouseDown={this.handleMouseDown}
				onMouseUp={this.handleMouseUp}
			/>
		  </Container>
		);
	}
}

export default Sail;
