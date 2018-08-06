import React, { Component } from "react";
import { Query } from "react-apollo";
import gql from "graphql-tag";
import { Container, Row, Col, ButtonGroup, Button } from "reactstrap";
import SubscriptionHelper from "../../../helpers/subscriptionHelper";
import "./style.scss";

const queryData = `
id
simulatorId
name
arrows {
  id
  signal
  frequency
  connected
  muted
}
signals {
  id
  name
  image
  color
  range {
    lower
    upper
  }
}
state
frequency
amplitude
power {
  power
  powerLevels
}
damage {
  damaged
  report
}
`;

const QUERY = gql`
  query ShortRangeComm($simulatorId: ID!) {
    shortRangeComm(simulatorId: $simulatorId) {
${queryData}
    }
  }
`;
const SUBSCRIPTION = gql`
  subscription ShortRangeCommUpdate($simulatorId: ID!) {
    shortRangeCommUpdate(simulatorId: $simulatorId) {
${queryData}
    }
  }
`;

class CommShortRange extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCall: null,
      selectedArrow: null
    };
  }
  _commHail() {
    const ShortRange = this.props.data.shortRangeComm[0];
    const mutation = gql`
      mutation CommAddArrow($id: ID!, $commArrowInput: CommArrowInput!) {
        commAddArrow(id: $id, commArrowInput: $commArrowInput)
      }
    `;
    const variables = {
      id: ShortRange.id,
      commArrowInput: {
        signal: this.state.selectedCall
      }
    };
    this.props.client.mutate({
      mutation,
      variables
    });
  }
  _commCancel(id) {
    const ShortRange = this.props.data.shortRangeComm[0];
    const mutation = gql`
      mutation CommRemoveArrow($id: ID!, $arrowId: ID!) {
        commRemoveArrow(id: $id, arrowId: $arrowId)
      }
    `;
    const variables = {
      id: ShortRange.id,
      arrowId: this.state.selectedArrow
    };
    this.props.client.mutate({
      mutation,
      variables
    });
    this.setState({
      selectedArrow: null
    });
  }
  _commConnect() {
    const ShortRange = this.props.data.shortRangeComm[0];
    const mutation = gql`
      mutation CommConnectHail($id: ID!) {
        connectHail(id: $id)
      }
    `;
    const variables = {
      id: ShortRange.id
    };
    this.props.client.mutate({
      mutation,
      variables
    });
  }
  commReject = () => {
    const mutation = gql`
      mutation CancelHail($id: ID!) {
        cancelHail(id: $id, core: true)
      }
    `;
    const ShortRange = this.props.data.shortRangeComm[0];
    const variables = {
      id: ShortRange.id
    };
    this.props.client.mutate({
      mutation,
      variables
    });
  };
  getSignal() {
    const ShortRange = this.props.data.shortRangeComm[0];
    return ShortRange.signals.reduce((prev, next) => {
      if (
        next.range.upper > ShortRange.frequency &&
        next.range.lower < ShortRange.frequency
      )
        return next;
      return prev;
    }, {});
  }
  render() {
    if (this.props.data.loading || !this.props.data.shortRangeComm) return null;
    const { selectedCall, selectedArrow } = this.state;
    const ShortRange = this.props.data.shortRangeComm[0];
    if (!ShortRange) return <p>No short range comm</p>;
    return (
      <Container fluid className="shortRangeComm-core">
        <Row>
          <Col sm="12" style={{ height: "100%" }}>
            <p>
              Freq: {Math.round(ShortRange.frequency * 37700 + 37700) / 100} MHz
              - Amp: {Math.round(ShortRange.amplitude * 100) / 100} -{" "}
              {this.getSignal().name}
            </p>
            <div>
              External Call
              {ShortRange.state === "hailing" ? (
                <ButtonGroup>
                  <Button
                    onClick={this._commConnect.bind(this)}
                    size="sm"
                    color="info"
                  >
                    Hailing - Connect
                  </Button>
                  <Button onClick={this.commReject} size="sm" color="warning">
                    Reject
                  </Button>
                </ButtonGroup>
              ) : null}
            </div>
            <select
              value={selectedCall || ""}
              onChange={e => {
                this.setState({ selectedCall: e.target.value });
              }}
            >
              <option value={null}>---</option>
              {ShortRange.signals.length === 0 && (
                <option value="random">Random</option>
              )}
              {ShortRange.signals.map(s => {
                return (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                );
              })}
            </select>
            <Button
              size="sm"
              color="default"
              disabled={!selectedCall}
              onClick={this._commHail.bind(this)}
            >
              Hail
            </Button>
            <p>Current Comms</p>
            <div className="commList">
              {ShortRange.arrows.map(a => {
                const signal = ShortRange.signals.find(s => s.id === a.signal);
                return (
                  <p
                    key={a.id}
                    onClick={() => {
                      this.setState({ selectedArrow: a.id });
                    }}
                    className={`${a.connected ? "text-success" : ""} ${
                      a.muted ? "text-purple" : ""
                    } ${a.id === selectedArrow ? "selected" : ""}`}
                  >
                    {signal && signal.name} -{" "}
                    {Math.round(a.frequency * 37700 + 37700) / 100} MHz
                    {a.muted && ` - Muted`}
                  </p>
                );
              })}
            </div>
            <Button
              disabled={!selectedArrow}
              onClick={this._commCancel.bind(this)}
              size="sm"
              block
              color="default"
            >
              Cancel
            </Button>
          </Col>
        </Row>
      </Container>
    );
  }
}
const ShortRangeCommCoreData = props => (
  <Query query={QUERY} variables={{ simulatorId: props.simulator.id }}>
    {({ loading, data, subscribeToMore }) => {
      const { shortRangeComm } = data;
      if (loading || !shortRangeComm) return null;
      if (!shortRangeComm[0]) return <div>No ShortRangeComm</div>;
      return (
        <SubscriptionHelper
          subscribe={() =>
            subscribeToMore({
              document: SUBSCRIPTION,
              variables: { simulatorId: props.simulator.id },
              updateQuery: (previousResult, { subscriptionData }) => {
                return Object.assign({}, previousResult, {
                  shortRangeComm: subscriptionData.data.shortRangeCommUpdate
                });
              }
            })
          }
        >
          <CommShortRange {...props} {...shortRangeComm[0]} />
        </SubscriptionHelper>
      );
    }}
  </Query>
);
export default ShortRangeCommCoreData;
