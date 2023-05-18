/*
The Cockatrice XML is of the form:

<?xml version="1.0" encoding="UTF-8"?>
<cockatrice_deck version="1">
    <deckname>Jank Standard Esper Control (40 card two ofs)</deckname>
    <comments></comments>
    <zone name="main">
        <card number="1" name="Wash Away"/>
        <card number="2" name="Path of Peril"/>
        [ ... ]
    </zone>
    <zone name="side">
        <card number="1" name="Path of Peril"/>
        <card number="1" name="Duress"/>
        [ ... ]
    </zone>
</cockatrice_deck>
*/

function cod_to_obj(cod_contents) {
    var parser = new DOMParser();
    var cod_doc = parser.parseFromString(cod_contents, 'text/xml');
    var cockatrice_deck = cod_doc.getElementsByTagName('cockatrice_deck').item(0);
    var zones = cockatrice_deck.getElementsByTagName('zone');
    var deckname = cockatrice_deck.getElementsByTagName('deckname').item(0);

    var ret = {
        name: deckname.textContent,
        main: {},
        side: {}
    };

    for (var i = 0; i < zones.length; i++) {
        var zone = zones.item(i);
        console.debug(zone);
        var zone_name = zone.attributes.name.textContent;

        if (zone_name === 'main') {
            for (var j = 0; j < zone.children.length; j++) {
                var child = zone.children.item(j);
                console.debug(child);
                ret.main[child.attributes.name.textContent] = parseInt(child.attributes.number.textContent);
            }
        } else if (zone_name === 'side') {
            for (var j = 0; j < zone.children.length; j++) {
                var child = zone.children.item(j);
                console.debug(child);
                ret.side[child.attributes.name.textContent] = parseInt(child.attributes.number.textContent);
            }
        }
    }

    return ret;
}

function obj_to_cod(deck_obj) {
    var ret = `<?xml version="1.0" encoding="UTF-8"?>
<cockatrice_deck version="1">
    <deckname>${deck_obj.name}</deckname>
    <comments></comments>
    <zone name="main">\n`;

    Object.keys(deck_obj.main).forEach(card => {
        ret += `        <card number="${deck_obj.main[card]}" name="${card}"/>\n`;
    });

    ret += `    </zone>
    <zone name="side">\n`;

    Object.keys(deck_obj.side).forEach(card => {
        ret += `        <card number="${deck_obj.side[card]}" name="${card}"/>\n`;
    });

    ret += `    </zone>
</cockatrice_deck>\n`;

    return ret;
}
