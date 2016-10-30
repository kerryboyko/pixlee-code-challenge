import request from 'request';
import reduxify from 'reduxify';
import React, { Component } from 'react';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import CircularProgress from 'material-ui/CircularProgress';
import Divider from 'material-ui/Divider';
import { DateRange } from 'react-date-range';
import { css, StyleSheet } from 'aphrodite'
import * as actions from '../actions/index';
import Archive from './Archive';


const styles = StyleSheet.create({
  main: {
    backgroundImage: "url(../static/img/dots-background.png)",
    backgroundRepeat: 'repeat-y',
    backgroundAttachement: 'fixed',
    backgroundSize: '100% auto',
    padding: '10px',
  },
});

const ROOT = process.env.ROOT_URL || 'http://localhost:';
const PORT = process.env.PORT || 3000;

class Results extends Component {
  constructor(props) {
    super(props);
    this.componentWillMount = this.componentWillMount.bind(this);
  }
  componentWillMount () {


    request({
      method: 'GET',
      url: ROOT + PORT + '/api/getCollection/' + this.props.params.queryId,
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json'
      },
      json: true,
    }, (err, response, body) => {
      console.log("err", err);
      console.log("response", response);
      console.log("body", body);
      this.props.actions.loadImages(body);
    });
  }

  render () {
    return (
      <div className={css(styles.main)}>
        <Archive />
      </div>
    );
  }
}

export default reduxify(actions, ['isLoading', 'minDate', 'maxDate', 'images'], Results);
