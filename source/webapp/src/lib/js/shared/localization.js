// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export default class Localization {
  static get isoCode() {
    return 'en-US';
  }

  static get Messages() {
    return Localization.Languages[Localization.isoCode].Messages;
  }

  static get Tooltips() {
    return Localization.Languages[Localization.isoCode].Tooltips;
  }

  static get Buttons() {
    return Localization.Languages[Localization.isoCode].Buttons;
  }

  static get Alerts() {
    return Localization.Languages[Localization.isoCode].Alerts;
  }

  static get Statuses() {
    return Localization.Languages[Localization.isoCode].Statuses;
  }

  static get Languages() {
    return {
      'en-US': {
        Messages: {
          /* signin flow */
          Title: 'Custom Brand Detection <span style="font-size:0.85rem">by AWS Specialist SA, AI/ML Team</span>',
          PasswordRequirement: 'Password must be at least <abbr title="eight characters">eight</abbr> characters long and contain <abbr title="one uppercase character">one</abbr> uppercase, <abbr title="one lowercase character">one</abbr> lowercase, <abbr title="one numeric character">one</abbr> number, and <abbr title="one special character">one</abbr> special character.',
          ResetSendCode: 'Please enter the username and press <strong>Send code</strong>. You should receive a 6-digits code in mail in a few minutes. You will need the code to reset the password.',
          ResetPassword: 'Please enter the verification code that has sent to your email address and your new password.',
          /* main tab controller */
          TrainingTab: 'Training',
          AnalysisTab: 'Analysis',
          WorkteamTab: 'Labeling Team',
          /* training tab */
          SelectTrainingOptionsDesc: 'Select different options to prepare and train your dataset.',
          Reminder: 'Reminder',
          ConfigureTeamMember: '<p/>You don\'t have any active team member in your Labeling Workteam. Would you like to configure your labeling workteam now?</p>',
          TrainingOptionWithBoundingBox: '<strong>Option 1:</strong> Choose this option if you would like to identify objects with bounding boxes; ie., honey bee, dog, cat, car, truck, mechanical part, glass bottle, boat, and so forth.',
          TrainingOptionWithConcept: '<strong/>Option 2:</strong> Choose this option if you would like to identify a concept of an image (image classification without bounding box); ie., sky, nature, night life, beach, places, romantic scene, and so forth.',
          TrainingOptionViewHistory: '<strong/>Option 3:</strong> Choose this option to view a history of your trainning jobs.',
          PrepareDatasetDesc: 'To prepare your dataset for labeling, specify a <strong>project name</strong>, <strong>label(s)</strong>, and <strong>drag and drop</strong> video and image files to the <abbr title="drop zone">drop zone</abbr>.',
          ProjectName: 'Specify project name',
          ProjectNameDesc: 'The project name is used to identify the Amazon SageMaker Ground Truth labeling job and the Amazon Rekognition Custom Labels model. The project name should only contain alphanumeric and dash characters. Leave it blank to auto-generate one.',
          Labels: 'Label(s)',
          LabelsDesc: 'Define a set of labels that you would like to train a model to recognize; i.e., AWS logo, dog, cat, and etc. Label should only contain alphanumeric, space, underscore, and dash characters. You must have at least one label specified and no more than 250 labels.',
          Dataset: 'Dataset',
          DatasetDesc: 'Start uploading your dataset by <abbr title="drag and drop">drag and drop</abbr> video and/or image files to the <abbr title="drop zone">drop zone</abbr> area. File formats can be .mp4, .mov, .jpg, .png.',
          /* view state machine history */
          ViewStateMachineHistory: 'View history of your labeling jobs',
          TrainingInProcess: 'Training job in process',
          TrainingInProcessDesc: 'Click on the item to refresh the status.',
          TrainingCompleted: 'Recently completed training job',
          TrainingCompletedDesc: 'Click on the item to view the trained Amazon Rekognition Custom Labels model on AWS Console.',
          TrainingFailed: 'Training jobs failed',
          TrainingFailedDesc: 'Click on the item to view the errors on AWS Step Functions execution on AWS Console.',
          ListOfExecutions: 'List of executions:',
          /* workteam tab */
          WorkteamTabDesc: '<p>This demo uses <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/sms-workforce-create-private-console.html" target="_blank">Amazon SageMaker Ground Truth Private Workforce</a> to manage your labeling workers. It is important to note that the workers are given a strict permission to only access a labeling portal to perform his/her job. The worker has no other permission to access other AWS resources nor this demo portal.</p><p>This wizard allows you to manage (add or remove) your labeling workers.</p>',
          Team: 'Labeling team',
          TeamDesc: 'By default, the demo solution creates an <a href="https://aws.amazon.com/cognito/" target="_blank">Amazon Cognito User Pool</a> to manage your labeling workers/members and is associated to an Amazon SageMaker Ground Truth Private Workforce. View <a href="{{TEAM_USERPOOL_URL}}" target="_blank">your private workforce (labeling work team)</a> on AWS Console.',
          SelectedTeam: 'Selected workteam',
          ManageTeam: 'Manage team members',
          ActiveMemberList: 'The labeling team has <strong>{{MEMBERS}}</strong> active member(s). To remove a member from the team, click on <abbr title="x">X</abbr> next to the email address.',
          RemoveMember: 'Remove member',
          RemoveMemberConfirmation: 'Confirm to remove {{TEAM_MEMBER}} from \'{{WORKTEAM}}\' work team?',
          AddMemberDesc: 'To add new member to the team, enter an email address and click on <abbr title="add email">Add email</abbr> button.',
          /* analysis tab */
          ViewAnalysisStateMachineHistory: 'History of your analysis jobs',
          AnalysisInProcess: 'Analysis job in process',
          AnalysisInProcessDesc: 'Click on the item to refresh the status.',
          AnalysisCompleted: 'Recently completed analysis job',
          AnalysisCompletedDesc: 'Click on the item to view the AWS Step Functions Execution on AWS Console.',
          AnalysisFailed: 'Analysis jobs failed',
          AnalysisFailedDesc: 'Click on the item to view the AWS Step Functions Execution on AWS Console.',
          StartAnalysisDesc: 'To start new analysis, select the <strong>project</strong>, the <strong>version of the project (a model)</strong>, and <strong>drag and drop</strong> video and image files to the <abbr title="drop zone">drop zone</abbr>.',
          ProjectVersionName: 'Project Name, Version, and Inference Units',
          ProjectVersionDesc: 'A project name refers to the <a href="https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/cp-create-project.html" target="_blank">Amazon Rekognition Custom Labels Project</a>. The project version represents the specific version (a model snapshot) that you have trained. The inference units allow you to create up to <abbr title="inference">5</abbr> inferences. Depending on the complexity of the trained model, one inference can process 5 to 10 images per second. If you need high throughput, specify 4 (or 5) inference units. (Note: the actual throughput varies.)',
          SpecifyProjectVersion: 'Specify project version',
          SpecifyInferenceUnits: 'Inference units',
          MediaFiles: 'Media Files',
          MediaFilesDesc: 'Start uploading video and/or image files by <abbr title="drag and drop">drag and drop</abbr> files to the <abbr title="drop zone">drop zone</abbr> area to analyze. Video formats can be .mp4 and .mov. Image formats can be .jpg and .png.',
          TrackDesc: 'Click on the button below to display labels on screen:',
          StatisticsDesc: 'The following bar chart shows the distribution of detected custom labels over the entire video:',
          KeyframesDesc: 'Expand the minute elements to examine custom labels detected in the frame level:',
          Overall: 'OVERALL',
          DropFilesHere: 'Drop video file(s) here',
          Download: 'Download',
          ViewJson: 'View JSON',
          LineChartTitle: 'Custom Labels Distribution over Time',
          /* project tab */
          FilesReadyToUpload: 'File(s) ready to upload',
          Name: 'Name',
          Size: 'Size',
          Type: 'Type',
          Status: 'Status',
          DateAdded: 'Start Time',
          DateCompleted: 'End Time',
          RunningState: 'Current state',
          DataNotAvailable: 'Data not available',
        },
        Tooltips: {
          /* main view */
          VisitSolutionPage: 'Learn more about Amazon Rekognition Segment Detection',
          Logout: 'ready to logout?',
          ViewOnAWSConsole: 'view on console',
        },
        Buttons: {
          No: 'No',
          Yes: 'Yes',
          Back: 'Back',
          Next: 'Next',
          Done: 'Done',
          Cancel: 'Cancel',
          Close: 'Close',
          Startover: 'Start over',
          StartNow: 'Start now',
          StartAnalysis: 'Start new analysis',
          CreateProject: 'Create project',
          AddLabel: 'Add label',
          AddEmail: 'Add email',
          ConfirmNow: 'Confirm and add members',
          ClosePreview: 'Close preview window',
          SelectOption: 'Select this option',
          DownloadFrameAnalysis: 'Download frame analysis',
        },
        Statuses: {
        },
        Alerts: {
          Oops: 'Oops...',
          Warning: 'Warning',
          Confirmed: 'Confirmed',
          Info: 'Info',
          Success: 'Success',
          /* sign in */
          PasswordConformance: 'Passwords don\'t conform with the requirements. Please make sure the password is at least 8 characters, 1 uppercase, 1 lowercase, 1 numeric, and 1 special character.',
          UsernameConformance: 'Username don\'t conform with the requirements. Please make sure the username only contains alphanumeric and/or \'.\', \'_\', \'%\', \'+\', \'-\' characters',
          SignInProblem: 'Problem to sign in. Please try again.',
          MismatchPasswords: 'Passwords don\'t match. Please re-enter the password',
          PasswordConfirmed: 'Your new password has been set. Please re-sign in to the portal.',
          SessionExpired: 'Session expired. Please sign in again.',
          /* label dataset */
          InvalidProjectName: 'Invalid project name. Make sure the project name contains only alphnumeric and dash characters.',
          InvalidLabel: 'Invalid label name. Label name can only contain alphnumeric, space, underscore, and dash characters and maximum 16 characters.',
          InvalidEmail: 'Invalid email address',
          MaxNumOfLabels: 'You can add at most 250 labels.',
          NoDataset: 'Please drag and drop video and/or image files to the drop zone area to start.',
          NoLabel: 'You must have at least ONE label to start the project.',
          StartNewProjectError: 'Fail to start project, <strong>{{PROJECT_NAME}}</strong>...',
          StartNewProjectSucceed: '<strong>{{PROJECT_NAME}}</strong> has started!',
          RemoveMemberError: 'Fail to remove {{TEAM_MEMBER}} from \'{{WORKTEAM}}\' work team.',
          AddMemberError: 'Fail to remove {{TEAM_MEMBER}} from \'{{WORKTEAM}}\' work team.',
          NoNewMembers: 'No new member to add',
          ProjectNameNotSelected: 'Please select a Project name',
          ProjectVersionNotSelected: 'Please select a Project version',
        },
      },
    };
  }
}
