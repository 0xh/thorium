import React, { Component } from "react";
import moment from "moment";
import { Button } from "reactstrap";
import gql from "graphql-tag";
import { withApollo } from "react-apollo";
import { publish } from "../helpers/pubsub";

const TIMESYNC_SUB = gql`
  subscription SyncTime($simulatorId: ID!) {
    syncTime(simulatorId: $simulatorId) {
      time
      active
    }
  }
`;
class Timer extends Component {
  state = {
    timer: "00:00:00",
    sync:
      (window.localStorage.getItem("thorium_syncTime") || "false") === "true"
  };
  componentDidMount() {
    this.subscription = this.props.client
      .subscribe({
        query: TIMESYNC_SUB,
        variables: {
          simulatorId: this.props.simulator.id
        }
      })
      .subscribe({
        next: ({ data: { syncTime } }) => {
          this.state.sync &&
            this.setState(
              { timer: syncTime.time, stopped: !syncTime.active },
              () => {
                clearTimeout(this.timer);
                this.updateTimer();
              }
            );
        },
        error(err) {
          console.error("err", err);
        }
      });
  }
  componentWillUnmount() {
    this.subscription && this.subscription.unsubscribe();
    clearTimeout(this.timer);
  }
  updateTimer = () => {
    if (
      this.state.stopped ||
      this.state.timer === "00:00:00" ||
      this.state.timer === "0:0:0"
    ) {
      return;
    }
    const dur = moment.duration(this.state.timer);
    dur.subtract(1, "second");
    this.setState({
      timer: moment.utc(dur.as("milliseconds")).format("HH:mm:ss")
    });
    this.timer = setTimeout(this.updateTimer, 1000);
  };
  setTimer = () => {
    const seconds = prompt("Enter the number of seconds:", 0);
    if (!seconds && seconds !== 0) return;
    const minutes = prompt("Enter the number of minutes:", 0);
    if (!minutes && minutes !== 0) return;
    const hours = prompt("Enter the number of hours:", 0);
    if (!hours && hours !== 0) return;

    clearTimeout(this.timer);
    this.timer = null;
    const mutation = gql`
      mutation SyncTimer($time: String, $active: Boolean, $simulatorId: ID!) {
        syncTimer(time: $time, active: $active, simulatorId: $simulatorId)
      }
    `;
    this.state.sync &&
      this.props.client.mutate({
        mutation,
        variables: {
          time: `${hours}:${minutes}:${seconds}`,
          active: true,
          simulatorId: this.props.simulator.id
        }
      });
    this.setState(
      { timer: `${hours}:${minutes}:${seconds}`, stopped: false },
      () => {
        this.updateTimer();
      }
    );
  };
  toggleTimer = () => {
    const { stopped } = this.state;
    if (stopped) {
      this.setState(
        {
          stopped: false
        },
        () => {
          this.updateTimer();
        }
      );
    } else {
      clearTimeout(this.timer);
      this.timer = null;
      this.setState({
        stopped: true
      });
    }
    const mutation = gql`
      mutation SyncTimer($time: String, $active: Boolean, $simulatorId: ID!) {
        syncTimer(time: $time, active: $active, simulatorId: $simulatorId)
      }
    `;
    this.state.sync &&
      this.props.client.mutate({
        mutation,
        variables: {
          time: this.state.timer,
          active: stopped,
          simulatorId: this.props.simulator.id
        }
      });
  };
  sendToSensors = () => {
    const dur = moment.duration(this.state.timer);
    const data = `Estimated time to arrival calculated: Approximately ${
      dur.hours() > 0 ? `${dur.hours()} hours, ` : ""
    }${
      dur.minutes() > 0 ? `${dur.minutes()} minutes, ` : ""
    }${dur.seconds()} seconds at current speed.`;
    publish("sensorData", data);
  };
  render() {
    const { timer, stopped } = this.state;
    return (
      <div>
        <div
          style={{
            color: "black",
            float: "left",
            width: "50%",
            backgroundColor: "rgb(251, 254, 61)",
            border: "1px solid rgb(210, 203, 67)",
            height: "16px",
            whiteSpace: "pre",
            textAlign: "center"
          }}
          onClick={this.setTimer}
        >
          {timer}
        </div>
        <Button
          color={stopped ? "primary" : "danger"}
          size="sm"
          style={{ height: "16px", float: "left" }}
          onClick={this.toggleTimer}
        >
          {stopped ? "Start" : "Stop"}
        </Button>
        <Button
          color={"success"}
          size="sm"
          style={{ height: "16px" }}
          onClick={this.sendToSensors}
        >
          Send to Sensors
        </Button>
        <label>
          <input
            type="checkbox"
            checked={this.state.sync}
            onClick={e => {
              this.setState({ sync: e.target.checked });
              window.localStorage.setItem("thorium_syncTime", e.target.checked);
            }}
          />
          Sync Cores
        </label>
      </div>
    );
  }
}

export default withApollo(Timer);
