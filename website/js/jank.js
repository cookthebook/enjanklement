/* load common navbar in pages */
var navbar = document.getElementById('JankNavbar');
navbar.classList.add('navbar');
navbar.innerHTML = `
<section class="navbar-section">
    <h1><a href="index.html">JANK!</a></h1>

    <div class="divider-vert"></div>

    <div class="popover popover-bottom">
        <button class="btn">Standard</button>
        <div class="popover-container">
            <ul class="menu">
                <li class="menu-item">
                    <a href="standard_rules.html">Rules</a>
                </li>
                <li class="menu-item">
                    <a href="standard_builder.html">Deck Builder</a>
                </li>
            </ul>
        </div>
    </div>

    <div class="divider-vert"></div>

    <div class="popover popover-bottom">
        <button class="btn">Eternal</button>
        <div class="popover-container">
            <ul class="menu">
                <li class="menu-item">
                    <a href="eternal_rules.html">Rules</a>
                </li>
                <li class="menu-item">
                    <a href="eternal_list.html">Card List</a>
                </li>
                <li class="menu-item">
                    <a href="eternal_builder.html">Deck Builder</a>
                </li>
            </ul>
        </div>
    </div>
</section>`;