export default {
  delete(id) {
    this.records = this.records.filter((r) => r.id != id);
  },
  clear() {
    this.records = [];
  },
  sort() {
    this.records = this.records.sort((a, b) => {
      return a.timestamp - b.timestamp;
    });
  },
};
