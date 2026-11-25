'use strict';
const fs=require('node:fs'),path=require('node:path');
const principal="auth != null && root.child('access').child(auth.uid).child('enabled').val() === true && root.child('access').child(auth.uid).child('storeId').val() === auth.token.storeId && root.child('access').child(auth.uid).child('role').val() === auth.token.role && (!root.child('access').child(auth.uid).child('validAfter').exists() || auth.token.auth_time >= root.child('access').child(auth.uid).child('validAfter').val())";
const admin=`(${principal}) && auth.token.role === 'admin'`;
const owner=`(${principal}) && auth.token.role === 'user' && auth.token.storeId === $storeId`;
const reader=`(${admin}) || (${owner})`;
const bounded="newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000000";
const stable=`(${admin}) || (data.exists() && newData.val() === data.val())`;
const item={
  '.write':`(${admin}) || ((${owner}) && data.exists() && newData.exists())`,
  '.validate':`newData.hasChildren(['name','department','warehouse','used']) && ((${admin}) || data.exists())`,
  name:{'.validate':`newData.isString() && newData.val().length > 0 && newData.val().length <= 160 && (${stable})`},
  department:{'.validate':`newData.isString() && newData.val().length > 0 && newData.val().length <= 120 && (${stable})`},
  warehouse:{'.validate':bounded},used:{'.validate':bounded},
  updatedAt:{'.validate':'newData.isNumber() && newData.val() >= 0 && newData.val() <= now + 300000'},
  monthlyTransfer:{
    '.validate':"newData.hasChildren(['id','sourceId','sourceName','timestamp','previousWarehouse','previousUsed'])",
    id:{'.validate':'newData.isString() && newData.val().length <= 100'},
    sourceId:{'.validate':'newData.isString() && newData.val().length <= 150'},
    sourceName:{'.validate':'newData.isString() && newData.val().length <= 160'},
    timestamp:{'.validate':'newData.isNumber() && newData.val() >= 0 && newData.val() <= now + 300000'},
    previousWarehouse:{'.validate':bounded},previousUsed:{'.validate':bounded},
    actorUid:{'.validate':'newData.isString() && (newData.val() === auth.uid || newData.val() === data.val())'},
    '$other':{'.validate':false}
  },
  '$other':{'.validate':stable}
};
const rules={
  '.read':false,'.write':false,
  access:{'.read':admin,'$uid':{'.read':'auth != null && auth.uid === $uid','.write':false}},
  stores:{'.read':admin,'$storeId':{'.read':reader,'.write':false}},
  inventory:{
    '.read':admin,
    '$storeId':{'.read':reader,
      '.write':admin,
      '$productId':item
    }
  },
  history:{'.read':admin,'$storeId':{'.read':reader,'.indexOn':['timestamp'],'$entryId':{
    '.write':`(${reader}) && !data.exists() && newData.exists()`,
    '.validate':"newData.hasChildren(['action','timestamp','actorUid']) && newData.child('timestamp').isNumber() && newData.child('timestamp').val() >= now - 60000 && newData.child('timestamp').val() <= now + 60000 && newData.child('actorUid').val() === auth.uid",
    action:{'.validate':'newData.isString() && newData.val().length <= 80'},
    detail:{'.validate':'newData.isString() && newData.val().length <= 2000'},
    productName:{'.validate':'newData.isString() && newData.val().length <= 160'},
    changes:{'$index':{
      '.validate':"$index.matches(/^(0|[1-9][0-9]?|[1-4][0-9][0-9])$/) && newData.hasChildren(['target','warehouse','used'])",
      warehouse:{'.validate':bounded},used:{'.validate':bounded},
      '$other':{'.validate':"!newData.hasChildren() && (!newData.isString() || newData.val().length <= 500)"}
    }},
    '$other':{'.validate':"!newData.hasChildren() && (!newData.isString() || newData.val().length <= 500)"}
  }}},
  departments:{'.read':principal,'.write':admin,'$id':{'.validate':'newData.isString() && newData.val().length > 0 && newData.val().length <= 120'}},
  inventoryTemplates:{'.read':admin,'.write':admin},
  storeTypes:{'.read':admin,'.write':admin,'$storeId':{'.read':reader}},
  inventoryTemplateState:{'.read':admin,'.write':admin,'$storeId':{'.read':reader}}
};
fs.writeFileSync(path.join(__dirname,'..','database.rules.json'),JSON.stringify({rules},null,2)+'\n');
