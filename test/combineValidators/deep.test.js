import test from 'ava';
import omit from 'lodash.omit';
import isPlainObject from 'lodash.isplainobject';
import { fromJS } from 'immutable';

import {
  composeValidators,
  combineValidators,
  isRequired,
  isAlphabetic,
  isNumeric,
  isOneOf,
  matchesField,
} from '../../src';

function validate(isImmutable = false) {
  const validateData = combineValidators({
   'shallow': isAlphabetic('Shallow Prop'),

    'contact.name': composeValidators(
        isRequired,
        isAlphabetic
    )('Contact Name'),

    'contact.age': isNumeric('Contact Age'),

    'cars[].make': composeValidators(
        isRequired,
        isOneOf(['Honda', 'Toyota', 'Ford'])
    )('Car Make'),

    'deeply.nested[].list.cats[].name': isRequired('Cat Name'),

    'phones[]': isNumeric('Phone'),

    'otherContact.name': matchesField('contact.name')('Other Name'),
  }, isImmutable);
  return validateData;
}


function validValues(isImmutable = false, extendData) {
  let validData = {
    shallow: 'hello',

    contact: {
      name: 'Jeremy',
      age: '29',
    },

    cars: [
      { make: 'Toyota' },
    ],

    deeply: {
      nested: [
      {
        list: {
        cats: [
            { name: 'Gorby' },
        ],
        },
      },
      ],
    },

    phones: ['123'],

    otherContact: { name: 'Jeremy' },
  };
  if (extendData) {
    validData = { ...validData, ...extendData }
  }
  if (isImmutable) {
    return fromJS(validData);
  }
  return validData;
}

const validResult = {
  contact: {},
  cars: [{}],
  deeply: {
    nested: [
      {
        list: {
          cats: [{}],
        },
      },
    ],
  },
  phones: [undefined],
  otherContact: {},
};

for (const testType of [{ isImmutable: false }, { isImmutable: true }]) {
const isImmutable = testType.isImmutable;

test('returns empty objects for valid fields', t => {
  t.deepEqual(validate(isImmutable)(validValues(isImmutable)), validResult);
});


test('returns error value for shallow prop if invalid', t => {
  const allErrors = validate(isImmutable)(validValues(isImmutable, { shallow: '123' }));

  t.is(typeof allErrors.shallow, 'string');
  t.true(allErrors.shallow.length > 1);

  t.deepEqual(
    omit(allErrors, 'shallow'),
    omit(validResult, 'shallow')
  );
});

test('returns non empty object with error message for invalid contact age', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      contact: {
        name: 'Jeremy',
        age: 'abc',
      },
    })
  );

  const contactErrors = allErrors.contact;

  t.is(Object.keys(contactErrors).length, 1);
  t.is(typeof contactErrors.age, 'string');
  t.true(contactErrors.age.length > 1);

  t.deepEqual(
    omit(allErrors, 'contact'),
    omit(validResult, 'contact')
  );
});

test('returns non empty object with error message for missing contact name', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      contact: {},
      otherContact: {}
    })
  );

  const contactErrors = allErrors.contact;

  t.is(Object.keys(contactErrors).length, 1);
  t.is(typeof contactErrors.name, 'string');
  t.true(contactErrors.name.length > 1);

  t.deepEqual(
    omit(allErrors, 'contact'),
    omit(validResult, 'contact')
  );
});

test('returns non empty object with error message for invalid contact name', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      contact: { name: '123' },
      otherContact: { name: '123' }
    })
  );

  const contactErrors = allErrors.contact;

  t.is(Object.keys(contactErrors).length, 1);
  t.is(typeof contactErrors.name, 'string');
  t.true(contactErrors.name.length > 1);

  t.deepEqual(
    omit(allErrors, 'contact'),
    omit(validResult, 'contact')
  );
});

test('returns non empty object with error messages for invalid contact fields', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      contact: {
        name: '1234',
        age: 'abc',
      },

      otherContact: {
        name: '1234',
      }
    })
  );

  const contactErrors = allErrors.contact;

  t.is(Object.keys(contactErrors).length, 2);

  t.is(typeof contactErrors.name, 'string');
  t.is(typeof contactErrors.age, 'string');

  t.true(contactErrors.name.length > 1);
  t.true(contactErrors.age.length > 1);

  t.deepEqual(
    omit(allErrors, 'contact'),
    omit(validResult, 'contact')
  );
});

test('returns non empty objects for missing/invalid car makes', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      cars: [
        {}, { make: 'Lexus' },
      ],
    })
  );

  const [carOneErrors, carTwoErrors] = allErrors.cars;

  t.is(Object.keys(carOneErrors).length, 1);
  t.is(typeof carOneErrors.make, 'string');
  t.true(carOneErrors.make.length > 1);

  t.is(Object.keys(carTwoErrors).length, 1);
  t.is(typeof carTwoErrors.make, 'string');
  t.true(carTwoErrors.make.length > 1);

  t.deepEqual(
    omit(allErrors, 'cars'),
    omit(validResult, 'cars')
  );
});

test('returns non empty objects for missing cat names', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      deeply: {
        nested: [
          {
            list: {
              cats: [
                {}, { name: '' },
              ],
            },
          },
        ],
      }
    })
  );

  const [catOneErrors, catTwoErrors] = allErrors.deeply.nested[0].list.cats;

  t.is(Object.keys(catOneErrors).length, 1);
  t.is(typeof catOneErrors.name, 'string');
  t.true(catOneErrors.name.length > 1);

  t.is(Object.keys(catTwoErrors).length, 1);
  t.is(typeof catTwoErrors.name, 'string');
  t.true(catTwoErrors.name.length > 1);

  t.deepEqual(
    omit(allErrors, 'deeply'),
    omit(validResult, 'deeply')
  );
});

test('validates array of values', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      phones: ['123', 'abc'],
    })
  );

  const [phoneOneError, phoneTwoError] = allErrors.phones;

  t.is(phoneOneError, undefined);

  t.is(typeof phoneTwoError, 'string');
  t.true(phoneTwoError.length > 1);
});

test('validates otherContact name not matching contact name', t => {
  const allErrors = validate(isImmutable)(
    validValues(isImmutable, {
      contact: { name: 'Jeremy' },
      otherContact: { name: 'John' }
    })
  );

  const otherContactErrors = allErrors.otherContact;

  t.is(Object.keys(otherContactErrors).length, 1);
  t.is(typeof otherContactErrors.name, 'string');
  t.true(otherContactErrors.name.length > 1);

  t.deepEqual(
    omit(allErrors, 'otherContact'),
    omit(validResult, 'otherContact')
  );
});

test('handles validating empty object', t => {
  const allErrors = validate(isImmutable)({});

  const {
    contact: contactErrors,
    cars: carErrors,
    deeply: deeplyErrors,
  } = allErrors;

  t.is(Object.keys(allErrors).length, 5);
  t.true(isPlainObject(allErrors.contact));
  t.true(Array.isArray(allErrors.cars));
  t.true(isPlainObject(allErrors.deeply));

  t.is(Object.keys(contactErrors).length, 1);

  t.deepEqual(carErrors, []);

  t.deepEqual(deeplyErrors, { nested: [] });
});

test('handles validating missing object', t => {
  const allErrors = validate(isImmutable)();

  const {
    contact: contactErrors,
    cars: carErrors,
    deeply: deeplyErrors,
  } = allErrors;

  t.is(Object.keys(allErrors).length, 5);
  t.true(isPlainObject(allErrors.contact));
  t.true(Array.isArray(allErrors.cars));
  t.true(isPlainObject(allErrors.deeply));

  t.is(Object.keys(contactErrors).length, 1);

  t.deepEqual(carErrors, []);

  t.deepEqual(deeplyErrors, { nested: [] });
});
}
