import App from '../../app.js';
import { pubsub } from '../helpers/subscriptionManager.js';
import * as Classes from '../classes';

function getTimelineObject(simulatorId, missionId) {
  let object;
  if (simulatorId) object = App.simulators.find(s => s.id === simulatorId);
  if (missionId) object = App.missions.find(m => m.id === missionId);
  return object;
}
// Mission
App.on('createMission', ({ id, name }) => {
  const mission = new Classes.Mission({ id, name });
  App.missions.push(mission);
  pubsub.publish('missionsUpdate', App.missions);
});
App.on('removeMission', ({ missionId }) => {
  App.missions = App.missions.filter(m => m.id !== missionId);
  pubsub.publish('missionsUpdate', App.missions);
});
App.on('editMission', ({ missionId, name, description, simulators }) => {
  const mission = App.missions.find(m => m.id === missionId);
  mission.update({ name, description, simulators });
  pubsub.publish('missionsUpdate', App.missions);
});
App.on('addSimulatorToMission', ({ missionId, simulatorName }) => {
  const mission = App.missions.find(m => m.id === missionId);
  const simulator = new Classes.Simulator({ name: `${mission.name} : ${simulatorName}` });
  mission.addSimulator(simulator.id, simulatorName);
  App.simulators.push(simulator);
  pubsub.publish('missionsUpdate', App.missions);
});
App.on('removeSimulatorToMission', ({ missionId, simulatorId }) => {
  const mission = App.missions.find(m => m.id === missionId);
  mission.removeSimulator(simulatorId);
  App.simulators = App.simulators.filter(s => s.id !== simulatorId);
  pubsub.publish('missionsUpdate', App.missions);
});


// Flight
App.on('startFlight', ({ id, name, simulators}) => {
  // Loop through all of the simulators
  const simIds = simulators.map(s => {
    const template = Object.assign({}, App.simulators.find(sim => sim.id === s.simulatorId));
    template.id = null;
    const sim = new Classes.Simulator(template);
    sim.template = false;
    sim.mission = s.missionid;
    const stationSet = App.stationSets.find(ss => ss.id === s.stationSet);
    sim.stations = stationSet.stations;
    App.simulators.push(sim);
    return sim.id;
  });
  App.flights.push(new Classes.Flight({id, name, simulators: simIds}));
});


// Simulator
App.on('createSimulator', ({ id, name, template, flightId, timeline, stationSet }) => {
  const simulator = new Classes.Simulator({ id, name, template, timeline, launch: true });
  if (flightId) {
    const flight = App.flights.find(f => f.id === flightId);
    flight.addSimulator(simulator, stationSet);
  }
  App.simulators.push(simulator);
  // Initialize the simulator.
  simulator.nextTimeline();
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('removeSimulator', ({ simulatorId }) => {
  App.simulators = App.simulators.filter(s => s.id !== simulatorId);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('renameSimulator', ({ simulatorId, name }) => {
  const simulator = App.simulators.find(s => s.id === simulatorId);
  simulator.rename(name);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('changeSimulatorLayout', ({ simulatorId, layout }) => {
  const simulator = App.simulators.find(s => s.id === simulatorId);
  if (simulator) {
    simulator.setLayout(layout);
  }
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('changeSimulatorAlertLevel', ({ simulatorId, alertLevel }) => {
  const simulator = App.simulators.find(s => s.id === simulatorId);
  if (simulator) {
    simulator.setAlertLevel(alertLevel);
  }
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('changeSimulatorCrewCount', ({ simulatorId, crewCount }) => {
  const simulator = App.simulators.find(s => s.id === simulatorId);
  if (simulator) {
    simulator.setCrewCount(crewCount);
  }
  pubsub.publish('simulatorsUpdate', App.simulators);
});

// Timeline
App.on('addTimelineStep', ({ simulatorId, missionId, timelineStepId, name, description }) => {
  const object = getTimelineObject(simulatorId, missionId);
  object.addTimelineStep({ timelineStepId, name, description });
  pubsub.publish('missionsUpdate', App.missions);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('removeTimelineStep', ({ simulatorId, missionId, timelineStepId }) => {
  const object = getTimelineObject(simulatorId, missionId);
  object.removeTimelineStep(timelineStepId);
  pubsub.publish('missionsUpdate', App.missions);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('reorderTimelineStep', ({ simulatorId, missionId, timelineStepId, order }) => {
 const object = getTimelineObject(simulatorId, missionId);
 object.reorderTimelineStep(timelineStepId, order);
 pubsub.publish('missionsUpdate', App.missions);
 pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('updateTimelineStep', ({ simulatorId, missionId, timelineStepId, name, description }) => {
  const object = getTimelineObject(simulatorId, missionId);
  object.updateTimelineStep(timelineStepId, { name, description });
  pubsub.publish('missionsUpdate', App.missions);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('addTimelineItemToTimelineStep', ({ simulatorId, missionId, timelineStepId, timelineItemId, timelineItem }) => {
  const object = getTimelineObject(simulatorId, missionId);
  object.addTimelineStepItem(timelineStepId, timelineItemId, timelineItem);
  pubsub.publish('missionsUpdate', App.missions);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('removeTimelineStepItem', ({ simulatorId, missionId, timelineStepId, timelineItemId }) => {
  const object = getTimelineObject(simulatorId, missionId);
  object.removeTimelineStepItem(timelineStepId, timelineItemId);
  pubsub.publish('missionsUpdate', App.missions);
  pubsub.publish('simulatorsUpdate', App.simulators);
});
App.on('updateTimelineStepItem', ({ simulatorId, missionId, timelineStepId, timelineItemId, updateTimelineItem }) => {
  const object = getTimelineObject(simulatorId, missionId);
  object.updateTimelineStepItem(timelineStepId, timelineItemId, updateTimelineItem);
  pubsub.publish('missionsUpdate', App.missions);
  pubsub.publish('simulatorsUpdate', App.simulators);
});


// StationSet
App.on('createStationSet', ({ id, name, simulatorId }) => {
  const station = new Classes.StationSet({ id, name, simulatorId });
  App.stationSets.push(station);
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('removeStationSet', ({ stationSetID }) => {
  App.stationSets = App.stationSets.filter(s => s.id !== stationSetID);
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('renameStationSet', ({ stationSetID, name }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.rename(name);
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('addStationToStationSet', ({ stationSetID, stationName }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.addStation({ name: stationName });
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('removeStationFromStationSet', ({ stationSetID, stationName }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.removeStation(stationName);
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('editStationInStationSet', ({ stationSetID, stationName, newStationName }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.renameStation(stationName, newStationName);
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('addCardToStation', ({ stationSetID, stationName, cardName, cardComponent, cardIcon }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.addStationCard(stationName, { name: cardName, icon: cardIcon, component: cardComponent });
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('removeCardFromStation', ({ stationSetID, stationName, cardName }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.removeStationCard(stationName, cardName);
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('editCardInStationSet', ({ stationSetID, stationName, cardName, newCardName, cardComponent, cardIcon }) => {
  const stationSet = App.stationSets.find(ss => ss.id === stationSetID);
  stationSet.editStationCard(stationName, cardName, { name: newCardName, component: cardComponent, icon: cardIcon });
  pubsub.publish('stationSetUpdate', App.stationSets);
});
App.on('addedSystem', () => {

});
