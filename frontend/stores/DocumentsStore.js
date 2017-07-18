// @flow
import { observable, action, computed, ObservableMap, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Document from 'models/Document';
import ErrorsStore from 'stores/ErrorsStore';

class DocumentsStore {
  @observable recentlyViewedIds: Array<string> = [];
  @observable data: Map<string, Document> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;
  errors: ErrorsStore;

  /* Computed */

  @computed get recentlyViewed(): Array<Document> {
    return _.filter(this.data.values(), ({ id }) =>
      this.recentlyViewedIds.includes(id)
    );
  }

  @computed get recentlyEdited(): Array<Document> {
    // $FlowIssue
    return this.data.values();
  }

  @computed get starred(): Array<Document> {
    return _.filter(this.data.values(), 'starred');
  }

  /* Actions */

  @action fetchAll = async (request: string = 'list'): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.${request}`);
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('DocumentsStore#fetchAll', () => {
        data.forEach(document => {
          this.data.set(document.id, new Document(document));
        });
        this.isLoaded = true;
      });
      return data;
    } catch (e) {
      this.errors.add('Failed to load documents');
    } finally {
      this.isFetching = false;
    }
  };

  @action fetchRecentlyViewed = async (): Promise<*> => {
    const data = await this.fetchAll('viewed');

    runInAction('DocumentsStore#fetchRecentlyViewed', () => {
      this.recentlyViewedIds = _.map(data, 'id');
    });
  };

  @action fetchStarred = async (): Promise<*> => {
    await this.fetchAll('starred');
  };

  @action fetch = async (id: string): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post('/documents.info', { id });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      const document = new Document(data);

      runInAction('DocumentsStore#fetch', () => {
        this.data.set(data.id, document);
        this.isLoaded = true;
      });

      return document;
    } catch (e) {
      this.errors.add('Failed to load documents');
    } finally {
      this.isFetching = false;
    }
  };

  @action add = (document: Document): void => {
    this.data.set(document.id, document);
  };

  @action remove = (id: string): void => {
    this.data.delete(id);
  };

  getById = (id: string): ?Document => {
    return this.data.get(id);
  };

  getByUrl = (url: string): ?Document => {
    return _.find(this.data.values(), { url });
  };

  constructor() {
    this.errors = stores.errors;
  }
}

export default DocumentsStore;