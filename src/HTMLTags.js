let allTags = await fetch(`../src/Resource/defaultTagPermissions.json`).then(r => r.json());

export default {
  isAllowed(elem) {
    const nodeName = elem?.nodeName.toLowerCase() || `none`;
    const tag = allTags[nodeName];
    return !!tag;
  },
  setTagPermission({tagName = `none`, allowed = false}) {
      tagName = tagName.toLowerCase();
      if (rawTags[tagName]) { rawTags[tagName] = allowed; } ;
  },
};