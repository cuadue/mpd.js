import {parseResponse} from './index.js'

test('parseResponse test variety', () => {
    const {responses, remain} = parseResponse(`OK MPD 0.23.5
OK
repeat: 0
random: 0
single: 0
consume: 0
partition: default
playlist: 1
playlistlength: 0
mixrampdb: 0
state: stop
OK
ACK [5@0] {} unknown command "food"
extra stuff...`);
    expect(responses).toEqual([
        {kind: 'version', payload: '0.23.5'},
        {kind: 'data', payload: ''},
        {kind: 'data', payload:
`repeat: 0
random: 0
single: 0
consume: 0
partition: default
playlist: 1
playlistlength: 0
mixrampdb: 0
state: stop`
        },
        {kind: 'error', payload: 'unknown command "food"'}
    ]);
    expect(remain).toEqual('extra stuff...');
});

test('parseResponse test ends on OK', () => {
    const {responses, remain} = parseResponse(`OK MPD 0.23.5
OK
repeat: 0
random: 0
single: 0
consume: 0
partition: default
playlist: 1
playlistlength: 0
mixrampdb: 0
state: stop
OK
`);
    expect(responses).toEqual([
        {kind: 'version', payload: '0.23.5'},
        {kind: 'data', payload: ''},
        {kind: 'data', payload:
`repeat: 0
random: 0
single: 0
consume: 0
partition: default
playlist: 1
playlistlength: 0
mixrampdb: 0
state: stop`
        },
    ]);
    expect(remain).toEqual('');
});