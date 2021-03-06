import React, { useState } from 'react';
import {
  Select,
  SelectOption,
  SelectVariant,
  SelectGroup,
  Button
} from '@patternfly/react-core';
import { query } from 'gql-query-builder';
import _ from 'lodash';
import gql from 'graphql-tag';
import { useGetColumnPickerAttributesQuery } from '../../../graphql/types';
import { useApolloClient } from 'react-apollo';

export interface IOwnProps {
  columnPickerType: any;
  setColumnFilters: any;
  setTableLoading: any;
  getQueryTypes: any;
  setDisplayTable: any;
  parameters: any;
  setParameters: any;
  selected: any;
  setSelected: any;
}

const DomainExplorerColumnPicker: React.FC<IOwnProps> = ({
  columnPickerType,
  setColumnFilters,
  setTableLoading,
  getQueryTypes,
  setDisplayTable,
  parameters,
  setParameters,
  selected,
  setSelected
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const nullTypes = [null, 'String', 'Boolean', 'Int', 'DateTime'];
  const client = useApolloClient();

  const onSelect = (event, selection) => {
    if (selected.includes(selection)) {
      setSelected(prevState => prevState.filter(item => item !== selection));
      const innerText = event.nativeEvent.target.nextSibling.innerText;
      const rest = filterColumnSelection(event, innerText);
      setParameters(prevState =>
        prevState.filter(obj => {
          if (!_.isEqual(obj, rest)) {
            return obj;
          }
        })
      );
    } else {
      setSelected(prevState => [...prevState, selection]);
      const innerText = event.nativeEvent.target.nextSibling.innerText;
      const rest = filterColumnSelection(event, innerText);
      setParameters(prevState => [...prevState, rest]);
    }
  };

  const filterColumnSelection = (event, selection) => {
    const parent = event.nativeEvent.target.parentElement.parentElement.getAttribute(
      'aria-labelledby'
    );
    let res = {};
    const tempParents = parent.split('---');

    for (let i = tempParents.length - 1; i >= 0; i--) {
      if (i === tempParents.length - 1) {
        if (tempParents[i] === '-') {
          res = selection;
        } else {
          res = { [tempParents[i]]: [selection] }; // assign the value
        }
      } else {
        res = { [tempParents[i]]: [res] }; // put the prev object
      }
    }
    return res;
  };
  const onToggle = _isExpanded => {
    setIsExpanded(_isExpanded);
  };

  const getPicker = useGetColumnPickerAttributesQuery({
    variables: { columnPickerType }
  });

  async function generateQuery() {
    if (columnPickerType && parameters.length > 0) {
      const Query = query({
        operation: columnPickerType,
        fields: parameters
      });

      try {
        await client
          .query({
            query: gql`
              ${Query.query}
            `
          })
          .then(response => {
            setTableLoading(false);
            setColumnFilters(response.data);
            setDisplayTable(true);
            return response;
          });
      } catch (error) {
        return error;
      }
    } else {
      setDisplayTable(false);
    }
  }

  let data = [];
  const tempArray = [];
  !getPicker.loading &&
    getPicker.data.__type &&
    getPicker.data.__type.fields.filter(i => {
      if (i.type.kind === 'SCALAR') {
        tempArray.push(i);
      } else {
        data.push(i);
      }
    });
  data = tempArray.concat(data);

  const fetchSchema = option => {
    return (
      !getQueryTypes.loading &&
      getQueryTypes.data.__schema &&
      getQueryTypes.data.__schema.queryType.find(item => {
        if (item.name === option.type.name) {
          return item;
        }
      })
    );
  };

  let childItems;
  let finalResult: any = [];
  let parentItems: any;

  const childSelectionItems = (_data, title, ...attr) => {
    let nestedTitles = '';
    childItems = _data.map(group => {
      const label = title + ' / ' + attr.join();
      const childEle = (
        <SelectGroup
          label={label.replace(/\,/g, '')}
          key={Math.random()}
          id={group.name}
          value={title + group.name}
        >
          {group.fields
            .filter((item, _index) => {
              if (!nullTypes.includes(item.type.name)) {
                const tempData = [];
                const n = fetchSchema(item);
                tempData.push(n);
                nestedTitles = nestedTitles + ' / ' + item.name;
                childSelectionItems(tempData, title, attr, nestedTitles);
              } else {
                return item;
              }
            })
            .map(item => (
              <SelectOption
                key={Math.random()}
                value={item.name + title + group.name}
              >
                {item.name}
              </SelectOption>
            ))}
        </SelectGroup>
      );
      return childEle;
    });
    finalResult.push(childItems);
  };
  const child = [];
  const selectionItems = _data => {
    parentItems =
      !getPicker.loading &&
      _data
        .filter((group, index) => {
          if (group.type.kind !== 'SCALAR') {
            return group;
          } else {
            child.push(<SelectOption key={group.name} value={group.name} />);
          }
        })
        .map((group, index) => {
          let ele;
          ele = (
            <SelectGroup
              label={group.name}
              key={index}
              id={group.name}
              value={group.name}
            >
              {group.type.fields &&
                group.type.fields
                  .filter((item, _index) => {
                    if (!nullTypes.includes(item.type.name)) {
                      const tempData = [];
                      const _v = fetchSchema(item);
                      tempData.push(_v);
                      childSelectionItems(tempData, group.name, item.name);
                    } else {
                      if (item.type.kind !== 'LIST') {
                        return item;
                      }
                    }
                  })
                  .map((item, _index) => (
                    <SelectOption key={_index} value={item.name + group.name}>
                      {item.name}
                    </SelectOption>
                  ))}
            </SelectGroup>
          );

          !finalResult.includes(ele) && finalResult.push(ele);
        });
  };

  columnPickerType && selectionItems(data);
  const rootElement: any = (
    <SelectGroup label=" " key={Math.random()} id="" value=" ">
      {child}
    </SelectGroup>
  );
  finalResult = finalResult.flat();
  finalResult.unshift(rootElement);

  function getAllChilds(arr, comp) {
    const unique = arr
      .map(e => e[comp])
      .map((e, i, final) => final.indexOf(e) === i && i)
      .filter(e => arr[e])
      .map(e => arr[e]);

    return unique;
  }
  return (
    <React.Fragment>
      {!getPicker.loading && columnPickerType && (
        <>
          <Select
            variant={SelectVariant.checkbox}
            aria-label="Select Input"
            onToggle={onToggle}
            onSelect={onSelect}
            selections={selected}
            isExpanded={isExpanded}
            placeholderText="Pick columns"
            ariaLabelledBy="Column Picker dropdown"
            isGrouped
            maxHeight="60vh"
          >
            {getAllChilds(finalResult, 'props')}
          </Select>
          <Button variant="primary" onClick={generateQuery}>
            Apply columns
          </Button>
        </>
      )}
    </React.Fragment>
  );
};

export default React.memo(DomainExplorerColumnPicker);
