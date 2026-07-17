const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

//to define userschema
var authSchema = new mongoose.Schema({
  id: Number,
  email: String,
  userName: String,
  password: String,
  mobile: String,
  bloodGroup: String,
  token: String,
  emailVerified: {
    type: Boolean,
    default: false,
  },
  mobileVerified: {
    type: Boolean,
    default: false,
  },
  otp: String,
  steps: {
    type: Object,
    default: () => ({
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      step6: false,
    }),
  },
  relationName: String,
  sosMembersDetails:
  {
    type: Array,
    default: [],
  },
  dob: String,
  age: String,
  relationType: String,
  momType: {
    type: String,
    default: '',
  },
  totalNoOfChildren: {
    type: Number,
    default: 0
  },
  totalNoOfConception: Number,
  childrensArray: Array,
  medicalTreatment: String,
  nameOfTreatments: String,
  disablities: String,
  disabledType: String,
  historyOrAbortion: String,
  totalAbortion: Number,
  reason: String,
  tryingToConceiveNos: Number,
  conceiveCycle: Array,
  pregnancyDate: String,
  completedWeeks: {
    type: String,
    default: 0
  },
  enteredWeeks: {
    type: String,
    default: 0
  },
  completedMonths: {
    type: String,
    default: 0
  },
  enteredMonths: {
    type: String,
    default: 0
  },
  scanConfirmation: String,
  expectScanDeliveryDate: String,
  deliveryDate: String,
  cronUpdatedDate: String,
  adequacyControlViable: String,
  heartRate: String,
  crlCm: String,
  pregnancyWeeks: String,
  roleName: {
    type: String,
    default: "user"
  },
  profile: String,
  public_id: String,
  paymentMethod: String,
  // deviceId: {
  //   type: String,
  //   default: ""
  // },
  // fcmToken: {
  //   type: String,
  //   default: ""
  // },
  subscribed: {
    type: Boolean,
    default: false,
  },
  dietOverview: {
    type: Boolean,
    default: false,
  },
  dietSubscribed: {
    type: Boolean,
    default: false,
  },
  logout: {
    type: Boolean,
    default: false,
  },
  deviceInfos: {
    type: Array,
    default: []
  },
  status: {
    type: String,
    default: "Active",
  },
  height: {
    type: Number,
    default: 0
  },
  Weight: {
    type: Number,
    default: 0
  },
  weightUpdated: String,
  weightNotifyUpdated: String,
  latitude: String,
  longitude: String,
  lastLogin: { type: String, default: null },
  activeUser: {
    type: Boolean,
    default: true
  },
  exerciseSubscribed: {
    type: Boolean,
    default: false
  },
  exerciseOverview: {
    type: Boolean,
    default: false
  },
  ios: {
    type: Boolean,
    default: false,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
})

authSchema.virtual('subscriptions', {
  ref: 'UserPlan',
  localField: 'id',
  foreignField: 'userId',
  justOne: false
});

authSchema.virtual('subscriptions', {
  ref: 'UserPlan',
  localField: 'id',
  foreignField: 'userId',
  justOne: false
});

//to plugin mongoosepagination
authSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Auth', authSchema)
