import {test,expect} from '@playwright/test';
test('history shows instance requirements rather than the current template and explains legacy snapshots',async({page})=>{
 const task={id:'snapshot-task',revision:2,title:'读书要求调整',goal:'读书',status:'paused',supervisionStatus:'active',minutes:90,repeat:'daily',time:'21:00',requirement:'写五条心得',plan:{goal:'读书',conditions:'',steps:[],deliverable:'五条心得'},logs:[],outputs:[]};
 const run={id:'snapshot-run',taskId:task.id,day:'2020-01-01',status:'completed',seconds:2700,timerAt:null,evidence:'三条心得',artifactId:'',conditionsSnapshot:{minimumSeconds:2700,conditions:[{id:'result',description:'写三条心得'}]},snapshotNotice:'旧记录未保存当时的要求版本；此快照来自迁移时模板，不代表已还原历史。'};
 await page.route('**/api/v1/work-tasks',route=>route.fulfill({json:{tasks:[task],runs:[run]}}));
 await page.goto('/#workTasks');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByRole('button',{name:'查看历史',exact:true}).click();const card=page.locator('.phase-card').filter({hasText:'本次完成要求：写三条心得'});
 await expect(card).toContainText('45 / 45 分钟');await expect(card).not.toContainText('90 分钟');await expect(card).toContainText('不代表已还原历史');await expect(card.getByRole('button',{name:'确认完成',exact:true})).toBeDisabled();
 await expect(page.locator('.phase-panel')).toContainText('已暂停 · 监督进行中');
});
