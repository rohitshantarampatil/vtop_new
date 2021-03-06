/**
 *
 * Process monitor sensor
 *
 * (c) 2014 James Hall
 */
'use strict'

const os = require('os')
const childProcess = require('child_process')

const user = os.userInfo()
//console.log(user)

const plugin = {
  /**
   * * This appears in the title of the graph
   */
  title: 'Process List',
  mem1: 1,
  description: `
    This returns a process list, grouped by executable name. CPU % is divided by the number of cores.
    100% CPU Usage is all cores being maxed out. Unlike other tools that define the maximum as 800% for 8 cores for example.`,
  /**
   * The type of sensor
   * @type {String}
   */
  type: 'table',
  /**
   * The default interval time in ms that this plugin should be polled.
   * More costly benchmarks should be polled less frequently.
   */
  interval: 2000,

  initialized: false,

  sort: 'cpu',
  flag: 0,
  columns: [' pid  Command','CPU%', 'Count','Memory','User      '],
  currentValue: [], // Default processes are non-empty

  /**
   * Grab the current value for the table
   */
  poll () {
    const stats = {}
    // @todo If you can think of a better way of getting process stats,
    // then please feel free to send me a pull request. This is version 0.1
    // and needs some love.
    childProcess.exec('ps -ewwwo %cpu,%mem,pid,comm', (error, stdout, stderr) => {
      if (error) {
        console.error(error)
      }
      const lines = stdout.split('\n')
      // Ditch the first line
      lines[0] = ''
      for (const line in lines) {
        const currentLine = lines[line].trim().replace('  ', ' ')
        const words = currentLine.split(' ')
        if (typeof words[0] !== 'undefined' && typeof words[1] !== 'undefined' && typeof words[2] !== 'undefined') {
          let pid = words[2].replace(',','.')
          const cpu = words[0].replace(',', '.')
          const mem = words[1].replace(',', '.')
         
          const offset = cpu.length + mem.length + 2
          let comm = currentLine.slice(offset)
          // If we're on Mac then remove the path
          if (/^darwin/.test(process.platform)) {
            var a = comm.slice(0,6)
            comm = comm.split('/')
            comm = comm[comm.length - 1]
            comm = a.concat(comm)
          } else {
            // Otherwise assume linux and remove the unnecessary /1 info like
            // you get on kworker
            comm = comm.split('/')
            comm = comm[0]
          }
          // If already exists, then add them together
          if (typeof stats[comm] !== 'undefined') {
            stats[comm] = {
              pid: parseFloat(stats[comm].pid, 10) + parseFloat(pid),
              cpu: parseFloat(stats[comm].cpu, 10) + parseFloat(cpu),
              mem: parseFloat(stats[comm].mem, 10) + parseFloat(mem),
              comm,
              count: parseInt(stats[comm].count, 10) + 1
            }
          } else {
            stats[comm] = {
              cpu,
              pid,
              mem,
              comm,
              count: 1
            }
          }
        }
      }
      const statsArray = []
      for (const stat in stats) {
        // Divide by number of CPU cores
        const cpuRounded = parseFloat(stats[stat].cpu / os.cpus().length).toFixed(1)
        const memRounded = parseFloat(stats[stat].mem).toFixed(1)
        //console.log(stats[stat].pid)
        // const pid=parseFloat(stats[stat].pid).toFixed(1)
        statsArray.push({
          ' pid  Command': stats[stat].comm,
          'Count': stats[stat].count,
          'pid': stats[stat].comm.slice(0,6),
          'CPU%': cpuRounded,
          'Memory': memRounded*plugin.mem1,
          'User      ' : user.username,
          'cpu': stats[stat].cpu,
          'mem': stats[stat].mem // exact cpu for comparison
        })
      }
      statsArray.sort((a, b) => parseFloat(b[plugin.sort]) - parseFloat(a[plugin.sort]))
      //plugin.flag = 0
      if(plugin.flag == 1){
        statsArray.reverse()
      }      
      plugin.currentValue = statsArray
      plugin.initialized = true
    })
  }
}
module.exports = exports = plugin
