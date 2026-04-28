const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to server!');

  socket.on('new_sos_alert', (data) => {
    console.log('Received new_sos_alert!', JSON.stringify(data, null, 2));
    if (data.autoReserved) {
      console.log('✅ Auto Reservation Success!');
      console.log('Hospital:', data.autoReserved.hospital.name);
      console.log('Beds Requested:', data.autoReserved.bed, '| Doctor Requested:', data.autoReserved.doctor);
    } else {
      console.log('❌ Auto Reservation missing!');
    }
    
    // Simulate dispatcher click
    console.log('Simulating dispatcher dispatching...');
    socket.emit('deploy_unit', { 
      targetGps: { lat: data.lat, lon: data.lon }, 
      sosId: data.id, 
      hospitalId: data.autoReserved ? data.autoReserved.hospital.id : null,
      firstAid: data.triage.firstAid
    });
  });

  socket.on('pre_alert_generated', (data) => {
    console.log('Received pre_alert_generated!', data.id);
  });

  socket.on('help_is_coming', (data) => {
    console.log('Received help_is_coming (victim terminal)!', data);
  });

  socket.on('dispatch_assignment', (data) => {
    console.log('Received dispatch_assignment (responder terminal)!', data);
    console.log('✅ First Aid Transmitted:', data.firstAid);
    console.log('✅ End to End Test Complete!');
    process.exit(0);
  });

  console.log('Emitting "send_sos" (Unconscious, Critical)...');
  socket.emit('send_sos', {
    lat: 18.5204,
    lon: 73.8567,
    type: 'EMERGENCY',
    subtype: 'UNCONSCIOUS',
    notes: 'patient is barely breathing'
  });
});
