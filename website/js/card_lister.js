class CardLister {
    constructor(elem, card_db = {}) {
        this.elem = elem;
        this.suggestion_elem = document.createElement('datalist');
        this.suggestion_elem.id = Math.random().toString(36);
        this.elem.appendChild(this.suggestion_elem);
        console.debug(this.suggestion_elem.id);
        this.set_card_db(card_db);
        this.card_elems = [];
        this._update();
    }

    get_card_list() {
        var ret = [];

        this.card_elems.forEach(card_elem => {
            var card = this._card_elem_to_card(card_elem);

            if (card.name !== '') {
                ret.push(card);
            }
        });

        return ret;
    }

    import(cards) {
        this.divs.forEach(div_elem => {
            div_elem.remove();
        });

        this.forms = [];
        this.card_elems = [];

        cards.forEach(card => {
            this._new_card_elem(card.name, card.count);
        });
        this._update();
    }

    set_card_db(card_db, basics) {
        if (!card_db || !basics) {
            return;
        }

        this.db = card_db;
        this.basics = basics;
        this.card_names = Object.keys(this.db).concat(basics);
    }

    _card_elem_to_card(card_elem) {
        var inputs = card_elem.getElementsByTagName('input');
        return {
            name: inputs[0].value,
            count: inputs[1].value
        };
    }

    _update() {
        if (
            this.card_elems.length === 0 ||
            this._card_elem_to_card(this.card_elems[this.card_elems.length-1]).name !== ''
        ) {
            this._new_card_elem();
        }

        /* remove trailing empty cards */
        for (let i = this.card_elems.length-2; i >= 0; i--) {
            if (this._card_elem_to_card(this.card_elems[i]).name === '') {
                this._remove_card_elem(this.card_elems[i]);
            } else {
                break;
            }
        }

        /* set label numbers */
        for (let i = 0; i < this.card_elems.length; i++) {
            this.card_elems[i].firstChild.innerText = `${i+1}. `;
        }
    }

    _new_card_elem(name='', count=1) {
        var form_group = document.createElement('form');
        form_group.classList.add('form-group', 'form-horizontal');
        this.card_elems.push(form_group);
        this.elem.appendChild(form_group);
        form_group.addEventListener('input', () => {
            this._update();
        });

        var card_label = document.createElement('label');
        card_label.classList.add('col-1', 'col-sm-12');
        form_group.appendChild(card_label);

        var card_name = document.createElement('input');
        card_name.classList.add('col-9', 'col-sm-12');
        card_name.type = 'text';
        card_name.placeholder = 'Card Name';
        card_name.value = name;
        card_name.addEventListener('input', () => {
            this._get_suggestions(card_name)
        })
        form_group.appendChild(card_name);

        var card_count = document.createElement('input');
        card_count.classList.add('col-2', 'col-sm-12');
        card_count.type = 'number';
        card_count.min = 0;
        card_count.value = count;
        form_group.appendChild(card_count);
    }

    _remove_card_elem(card_elem) {
        this.card_elems.splice(this.card_elems.indexOf(card_elem), 1);
        card_elem.remove();
    }

    _get_suggestions(input_elem) {
        var search = fuzzysort.go(
            input_elem.value,
            this.card_names,
            { limit: 10, threshold: -10000 }
        );

        if (search === undefined || search.length === 0) {
            return;
        }

        var suggestion_html = '';
        if (search.length > 2 || search[0].target !== input_elem.value) {
            search.forEach(result => {
                suggestion_html += `<option value="${result.target}">${result.target}</option>`;
            });
        }
        this.suggestion_elem.innerHTML = suggestion_html;
        console.debug(this.suggestion_html);
        input_elem.setAttribute('list', this.suggestion_elem.id);
    }
}

export { CardLister };
